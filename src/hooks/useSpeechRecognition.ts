"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * STT via Web Speech API del navegador — funciona sin ninguna API key.
 * Es el "modo mock" gratuito de reconocimiento de voz que pide el spec del MVP.
 * Cuando haya OPENAI_API_KEY para Whisper, se puede rutear el audio grabado
 * a /api/stt en lugar de usar esto, sin tocar el resto de la UI.
 */

interface UseSpeechRecognitionResult {
  disponible: boolean;
  escuchando: boolean;
  transcripcion: string;
  error: string | null;
  iniciar: () => void;
  detener: () => void;
}

export function useSpeechRecognition(lang = "es-419"): UseSpeechRecognitionResult {
  const [disponible, setDisponible] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [transcripcion, setTranscripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setDisponible(false);
      return;
    }
    setDisponible(true);

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let texto = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        texto += event.results[i][0].transcript;
      }
      setTranscripcion(texto);
    };

    recognition.onerror = (event: any) => {
      setError(event.error ?? "Error de reconocimiento de voz");
      setEscuchando(false);
    };

    recognition.onend = () => {
      setEscuchando(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    };
  }, [lang]);

  const iniciar = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscripcion("");
    try {
      recognitionRef.current.start();
      setEscuchando(true);
    } catch (err) {
      // start() puede tirar error si ya está escuchando
      console.warn("[useSpeechRecognition] start():", err);
    }
  }, []);

  const detener = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setEscuchando(false);
  }, []);

  return { disponible, escuchando, transcripcion, error, iniciar, detener };
}
