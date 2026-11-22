import { useCallback, useEffect, useRef, useState } from 'react';

// WAV vide : sert à « déverrouiller » la lecture sur iOS/Safari, qui n'autorise play() qu'après un geste de l'utilisateur.
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

/**
 * Un seul lecteur audio pour toute la page : lancer une lecture arrête la précédente.
 *
 * `active` = { id, state } avec state ∈ 'idle' | 'loading' | 'playing'.
 * Les audios déjà obtenus sont gardés par `id` : réécouter une réponse ne refait aucun appel réseau.
 */
export function useAudioPlayer({ onError } = {}) {
  const audioRef = useRef(null);
  const urlRef = useRef('');
  const abortRef = useRef(null);
  const tokenRef = useRef(0);          // invalide les chargements devenus obsolètes
  const cacheRef = useRef(new Map());  // id -> Blob
  const onErrorRef = useRef(onError);
  const [active, setActive] = useState({ id: '', state: 'idle' });

  useEffect(() => { onErrorRef.current = onError; });

  const audio = () => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  };

  const release = () => {
    const element = audioRef.current;
    if (element) {
      element.onended = null;
      element.onerror = null;
      element.pause();
      element.removeAttribute('src');
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = '';
  };

  const stop = useCallback(() => {
    tokenRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    release();
    setActive({ id: '', state: 'idle' });
  }, []);

  /** À appeler DANS un clic (micro, « Écouter ») avant tout chargement asynchrone. */
  const prime = useCallback(() => {
    const element = audio();
    if (!element.paused || urlRef.current) return;   // déjà en cours : rien à déverrouiller
    element.muted = true;
    element.src = SILENCE;
    element.play().then(() => element.pause()).catch(() => {}).finally(() => {
      element.muted = false;
      if (element.src === SILENCE) element.removeAttribute('src');
    });
  }, []);

  const playBlob = useCallback(async (id, blob) => {
    stop();
    const token = tokenRef.current;
    const element = audio();
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    element.src = url;
    const finish = () => {
      if (tokenRef.current !== token) return;
      release();
      setActive({ id: '', state: 'idle' });
    };
    element.onended = finish;
    element.onerror = () => {
      finish();
      onErrorRef.current?.('playback');
    };
    setActive({ id, state: 'playing' });
    try {
      await element.play();
    } catch (error) {
      if (tokenRef.current !== token) return;
      finish();
      onErrorRef.current?.(error?.name === 'NotAllowedError' ? 'blocked' : 'playback');
    }
  }, [stop]);

  /** Mémorise l'audio d'un message (ex. réponse vocale reçue du serveur) sans le jouer. */
  const remember = useCallback((id, blob) => { cacheRef.current.set(id, blob); }, []);

  /** Bouton « Écouter » : relance/arrête la lecture du message `id` ; `load(signal)` fournit l'audio s'il manque. */
  const toggle = useCallback(async (id, load) => {
    if (active.id === id && active.state !== 'idle') {
      stop();
      return;
    }
    const cached = cacheRef.current.get(id);
    if (cached) {
      await playBlob(id, cached);
      return;
    }
    stop();
    const token = tokenRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setActive({ id, state: 'loading' });
    try {
      const blob = await load(controller.signal);
      if (tokenRef.current !== token) return;
      cacheRef.current.set(id, blob);
      await playBlob(id, blob);
    } catch (error) {
      if (tokenRef.current !== token || error?.name === 'AbortError') return;
      setActive({ id: '', state: 'idle' });
      onErrorRef.current?.(error);
    }
  }, [active, playBlob, stop]);

  useEffect(() => () => {
    tokenRef.current += 1;
    abortRef.current?.abort();
    release();
    cacheRef.current.clear();
  }, []);

  return { active, toggle, playBlob, remember, stop, prime };
}
