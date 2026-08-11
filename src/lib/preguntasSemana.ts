/**
 * Preguntas de reminiscencia, rotan una por semana (determinístico por
 * número de semana del año — misma pregunta para todos toda la semana, sin
 * necesitar guardar nada). Pensadas para invitar a compartir un recuerdo
 * concreto, no un feed social — Griyo es 1 a 1 con su familia, no una
 * comunidad como otras apps de bienestar.
 */
export const PREGUNTAS_SEMANA = [
  "¿Cuál fue el viaje que más disfrutaste en tu vida?",
  "¿Te acuerdas de alguna canción que te traiga buenos recuerdos? ¿Cuál?",
  "¿Cómo era tu casa cuando eras niño o niña?",
  "¿Cuál es la comida que más te gusta cocinar o que más te gusta comer?",
  "¿Recuerdas tu primer trabajo? ¿Cómo era?",
  "¿Hay alguna fiesta o celebración familiar que recuerdes con especial cariño?",
  "¿Cómo se conocieron tú y tu mejor amigo o amiga?",
  "¿Qué es lo que más te enorgullece de tu vida?",
  "¿Cuál fue el mejor consejo que te dio alguien de tu familia?",
  "¿Cómo era tu barrio cuando eras joven?",
  "¿Tienes alguna anécdota graciosa que te guste contar?",
  "¿Qué oficio o actividad te hubiera gustado aprender?",
];

function numeroDeSemana(fecha: Date): number {
  const inicioAno = new Date(fecha.getFullYear(), 0, 1);
  const dias = Math.floor((fecha.getTime() - inicioAno.getTime()) / 86_400_000);
  return Math.floor((dias + inicioAno.getDay()) / 7);
}

export function preguntaDeLaSemana(fecha: Date = new Date()): string {
  const indice = numeroDeSemana(fecha) % PREGUNTAS_SEMANA.length;
  return PREGUNTAS_SEMANA[indice];
}
