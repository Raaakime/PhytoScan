import { apiBlobRequest, apiRequest } from './apiClient';

export const getVoiceStatus = () => apiRequest('/voice/status');

export const sendVoiceMessage = ({ audio, language, sessionId, signal }) => {
  const form = new FormData();
  form.append('audio', audio, `recording.${audio.type.includes('mp4') ? 'mp4' : 'webm'}`);
  form.append('language', language);
  if (sessionId) form.append('session_id', sessionId);

  return apiRequest('/voice/chat', { method: 'POST', body: form, signal });
};

export const synthesizeWolofSpeech = (text, signal) =>
  apiBlobRequest('/assistant/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language: 'wo' }),
    signal,
  });
