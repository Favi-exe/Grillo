import type { MetricasVoz } from "@/lib/types";
import { segmentarEnergia } from "@/lib/voz/metricas";

/**
 * Mide el ritmo del habla mientras la persona conversa: mira la energía del
 * micrófono y, al terminar, devuelve solo números (ver MetricasVoz). Nunca
 * graba ni envía audio. Si algo falla, devuelve null y la charla sigue igual:
 * esta medición jamás debe interferir con el reconocimiento de voz.
 */

const MUESTREO_MS = 40;

/** En iPhone/iPad usar el micrófono para dos cosas a la vez puede cortar el reconocimiento de voz: ahí no se mide. */
export function puedeMedirVoz(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (process.env.NEXT_PUBLIC_MEDIR_VOZ === "0") return false;
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") return false;
  const ua = navigator.userAgent;
  const esIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return !esIOS;
}

export class AnalizadorVoz {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  private rms: number[] = [];
  private inicio = 0;
  private cancelado = false;

  async iniciar(): Promise<void> {
    if (!puedeMedirVoz()) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this.cancelado) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      this.ctx = new AudioContext();
      // Cuando la escucha se reanuda sola (sin un toque nuevo) el contexto puede quedar dormido.
      if (this.ctx.state === "suspended") await this.ctx.resume();
      const fuente = this.ctx.createMediaStreamSource(this.stream);
      const analizador = this.ctx.createAnalyser();
      analizador.fftSize = 1024;
      fuente.connect(analizador);
      const buffer = new Float32Array(analizador.fftSize);
      this.inicio = performance.now();
      this.timer = window.setInterval(() => {
        analizador.getFloatTimeDomainData(buffer);
        let suma = 0;
        for (let i = 0; i < buffer.length; i++) suma += buffer[i] * buffer[i];
        this.rms.push(Math.sqrt(suma / buffer.length));
      }, MUESTREO_MS);
    } catch {
      this.liberar();
    }
  }

  /** Corta la medición, suelta el micrófono y devuelve las medidas (null si no se pudo medir). */
  detener(palabras: number): MetricasVoz | null {
    this.cancelado = true;
    const transcurrido = performance.now() - this.inicio;
    const muestras = this.rms;
    this.liberar();
    if (muestras.length < 20 || this.inicio === 0) return null;
    // El intervalo real puede atrasarse un poco: se usa el promedio efectivo.
    const frameMs = transcurrido / muestras.length;
    const seg = segmentarEnergia(muestras, frameMs);
    return seg ? { ...seg, palabras } : null;
  }

  private liberar(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
