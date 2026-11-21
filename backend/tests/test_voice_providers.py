"""Tests des fournisseurs avec httpx.MockTransport : forme des requêtes et traduction des erreurs."""
import json

import httpx
import pytest

from app.core.exceptions import GatewayTimeoutError, ServiceUnavailableError, UpstreamServiceError
from app.voice.providers.elevenlabs import ElevenLabsTextToSpeech
from app.voice.providers.openai_compatible import OpenAISpeechToText, OpenAITextToSpeech
from app.voice.providers.wolof_service import WolofSpeechToText, WolofTextToSpeech, WolofVoiceClient


def client_for(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


def stt(handler):
    return OpenAISpeechToText(base_url="https://api.test/v1/", api_key="sk-test", model="stt-model",
                              prompts={"fr": "vocabulaire agricole"}, timeout=5, client=client_for(handler))


def tts(handler, instructions=None):
    return OpenAITextToSpeech(base_url="https://api.test/v1", api_key="sk-test", model="tts-model", voice="nova",
                              instructions=instructions or {"fr": "Parle clairement."}, timeout=5,
                              client=client_for(handler))


# ----------------------------------------------------------------------------- OpenAI-compatible
def test_openai_stt_request_shape_and_result():
    seen = {}

    def handler(request):
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["authorization"]
        seen["body"] = request.read()
        return httpx.Response(200, json={"text": "  bonjour la plante  "})

    assert stt(handler).transcribe(b"RIFFfakewav", "fr") == "bonjour la plante"
    assert seen["url"] == "https://api.test/v1/audio/transcriptions" and seen["auth"] == "Bearer sk-test"
    for expected in (b"stt-model", b'name="language"', b"fr", b"vocabulaire agricole", b"RIFFfakewav", b"speech.wav"):
        assert expected in seen["body"]


def test_openai_stt_without_prompt_for_other_languages_and_bad_json():
    seen = {}

    def handler(request):
        seen["body"] = request.read()
        return httpx.Response(200, content=b"<html>oops</html>")

    assert stt(handler).transcribe(b"wav", "en") == ""
    assert b'name="prompt"' not in seen["body"]


def test_openai_tts_request_shape():
    seen = {}

    def handler(request):
        seen["url"], seen["json"] = str(request.url), json.loads(request.read())
        return httpx.Response(200, content=b"mp3-bytes", headers={"content-type": "audio/mpeg"})

    speech = tts(handler).synthesize("Bonjour.", "fr")
    assert speech.content == b"mp3-bytes" and speech.mime_type == "audio/mpeg"
    assert seen["url"] == "https://api.test/v1/audio/speech"
    assert seen["json"] == {"model": "tts-model", "voice": "nova", "input": "Bonjour.", "response_format": "mp3",
                            "instructions": "Parle clairement."}


def test_openai_tts_omits_instructions_when_not_configured():
    seen = {}

    def handler(request):
        seen["json"] = json.loads(request.read())
        return httpx.Response(200, content=b"x")

    tts(handler, instructions={}).synthesize("Hello.", "en")
    assert "instructions" not in seen["json"]


@pytest.mark.parametrize("status,error,retry_after", [
    (429, ServiceUnavailableError, "7"),
    (503, ServiceUnavailableError, "5"),
    (401, UpstreamServiceError, None),
    (500, UpstreamServiceError, None),
])
def test_upstream_status_errors_are_translated(status, error, retry_after):
    headers = {"Retry-After": retry_after} if retry_after else {}
    with pytest.raises(error) as caught:
        tts(lambda request: httpx.Response(status, text="boom", headers=headers)).synthesize("Bonjour.", "fr")
    if retry_after:
        assert caught.value.headers["Retry-After"] == retry_after
    assert "sk-test" not in caught.value.detail


def test_timeouts_and_network_errors_are_translated():
    def slow(request):
        raise httpx.ReadTimeout("slow", request=request)

    def down(request):
        raise httpx.ConnectError("down", request=request)

    with pytest.raises(GatewayTimeoutError):
        tts(slow).synthesize("Bonjour.", "fr")
    with pytest.raises(ServiceUnavailableError):
        tts(down).synthesize("Bonjour.", "fr")


def test_readiness_follows_configuration():
    assert not OpenAISpeechToText(base_url="u", api_key="", model="m", prompts={}, timeout=1).is_ready()
    assert OpenAISpeechToText(base_url="u", api_key="k", model="m", prompts={}, timeout=1).is_ready()
    assert not ElevenLabsTextToSpeech(api_key="k", voice_id="", model="m", timeout=1).is_ready()


# ----------------------------------------------------------------------------- ElevenLabs
def test_elevenlabs_request_shape():
    seen = {}

    def handler(request):
        seen["url"], seen["key"], seen["json"] = str(request.url), request.headers["xi-api-key"], json.loads(request.read())
        return httpx.Response(200, content=b"mp3")

    engine = ElevenLabsTextToSpeech(api_key="el-key", voice_id="voice-1", model="eleven_multilingual_v2", timeout=5,
                                    client=client_for(handler))
    assert engine.synthesize("Bonjour.", "fr").content == b"mp3"
    assert seen["url"].startswith("https://api.elevenlabs.io/v1/text-to-speech/voice-1?output_format=mp3_44100_128")
    assert seen["key"] == "el-key" and seen["json"]["model_id"] == "eleven_multilingual_v2"
    assert "language_code" not in seen["json"]


# ----------------------------------------------------------------------------- microservice wolof
def wolof(handler):
    return WolofVoiceClient(base_url="http://voice:8080/", token="s3cret", timeout=5, client=client_for(handler))


def test_wolof_client_calls_and_auth_header():
    seen = []

    def handler(request):
        seen.append((request.method, request.url.path, request.headers.get("authorization")))
        if request.url.path == "/v1/transcribe":
            return httpx.Response(200, json={"text": " nanga def "})
        return httpx.Response(200, content=b"RIFFwav", headers={"content-type": "audio/wav"})

    client = wolof(handler)
    assert WolofSpeechToText(client).transcribe(b"wav", "wo") == "nanga def"
    speech = WolofTextToSpeech(client).synthesize("nanga def", "wo")
    assert speech.content == b"RIFFwav" and speech.mime_type == "audio/wav"
    assert seen == [("POST", "/v1/transcribe", "Bearer s3cret"), ("POST", "/v1/synthesize", "Bearer s3cret")]


def test_wolof_readiness_is_cached_and_tolerates_outages():
    calls = []

    def handler(request):
        calls.append(request.url.path)
        return httpx.Response(200, json={"stt": True, "tts": False})

    client = wolof(handler)
    assert WolofSpeechToText(client).is_ready() is True
    assert WolofTextToSpeech(client).is_ready() is False
    assert calls == ["/ready"]                                # une seule vérification pour les deux

    def down(request):
        raise httpx.ConnectError("down", request=request)

    assert WolofSpeechToText(wolof(down)).is_ready() is False


def test_wolof_client_retries_connection_errors_once():
    attempts = []

    def flaky(request):
        attempts.append(1)
        if len(attempts) == 1:
            raise httpx.ConnectError("cold start", request=request)
        return httpx.Response(200, json={"text": "waaw"})

    assert WolofSpeechToText(wolof(flaky)).transcribe(b"wav", "wo") == "waaw"
    assert len(attempts) == 2

    always_down = []

    def down(request):
        always_down.append(1)
        raise httpx.ConnectError("down", request=request)

    with pytest.raises(ServiceUnavailableError):
        WolofSpeechToText(wolof(down)).transcribe(b"wav", "wo")
    assert len(always_down) == 2


def test_wolof_client_does_not_retry_read_timeouts():
    attempts = []

    def slow(request):
        attempts.append(1)
        raise httpx.ReadTimeout("slow", request=request)

    with pytest.raises(GatewayTimeoutError):
        WolofTextToSpeech(wolof(slow)).synthesize("nanga def", "wo")
    assert len(attempts) == 1                                 # rejouer un calcul coûteux ne ferait que l'empiler
