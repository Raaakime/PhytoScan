import { apiBlobRequest, apiRequest } from './apiClient';

/** Ce que le serveur sait faire, langue par langue : { enabled, languages: { fr: { stt, tts }, ... }, ... } */
export const getVoiceStatus = (signal) => apiRequest('/voice/status', { signal });

const extensionFor = (mimeType = '') => {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
};

/** Question parlée -> { transcript, text, timestamp, sessionId, audioBase64, audioMimeType, audioError, ... } */
export const sendVoiceMessage = ({ audio, language, sessionId, signal }) => {
  const form = new FormData();
  form.append('audio', audio, `question.${extensionFor(audio.type)}`);
  form.append('language', language);
  if (sessionId) form.append('session_id', sessionId);
  // Pas de Content-Type : le navigateur ajoute lui-même la limite multipart.
  return apiRequest('/voice/chat', { method: 'POST', body: form, signal });
};

/** Lit un texte à voix haute -> Blob audio. */
export const synthesizeSpeech = (text, language, signal) =>
  apiBlobRequest('/voice/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
    signal,
  });

export function base64ToBlob(encoded, mimeType) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}
