"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * TTS via SpeechSynthesis del navegador — funciona sin ninguna API key.
 * Es el "modo mock" gratuito de voz que pide el spec del MVP.
 * Cuando haya ELEVENLABS_API_KEY, /api/tts devuelve audio real y se puede
 * reproducir con un <audio> en vez de esto, sin cambiar el resto de la UI.
 */

interface UseSpeechSynthesisResult {
  disponible: boolean;
  hablando: boolean;
  hablar: (texto: string) => void;
  detener: () => void;
}

export function useSpeechSynthesis(lang = "es-419"): UseSpeechSynthesisResult {
  const [disponible, setDisponible] = useState(false);
  const [hablando, setHablando] = useState(false);
  const vozPreferidaRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setDisponible(false);
      return;
    }
    setDisponible(true);

    const elegirVoz = () => {
      const voces = window.speechSynthesis.getVoices();
      const candidatas = voces.filter((v) => v.lang?.toLowerCase().startsWith("es"));
      const preferida =
        candidatas.find((v) => /female|mujer|paulina|mónica|elena|helena/i.test(v.name)) ??
        candidatas[0] ??
        voces[0] ??
        null;
      vozPreferidaRef.current = preferida;
    };

    elegirVoz();
    window.speechSynthesis.onvoiceschanged = elegirVoz;
  }, []);

  const hablar = useCallback(
    (texto: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = lang;
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      if (vozPreferidaRef.current) utterance.voice = vozPreferidaRef.current;
      utterance.onstart = () => setHablando(true);
      utterance.onend = () => setHablando(false);
      utterance.onerror = () => setHablando(false);
      window.speechSynthesis.speak(utterance);
    },
    [lang]
  );

  const detener = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setHablando(false);
  }, []);

  return { disponible, hablando, hablar, detener };
}
