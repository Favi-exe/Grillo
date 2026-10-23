import Abuela from "./Abuela";
import Abuelo from "./Abuelo";
import GriyoMascota from "./GriyoMascota";

/** Corazoncito decorativo que flota. */
function Corazon({ x, y, tam = 14, color = "#DA6A61", retraso = "0s" }: { x: number; y: number; tam?: number; color?: string; retraso?: string }) {
  return (
    <g className="animate-float-slow" style={{ animationDelay: retraso, transformBox: "fill-box" }}>
      <path
        d={`M${x} ${y + tam * 0.35}c-${tam * 0.1}-${tam * 0.5}-${tam * 0.8}-${tam * 0.4}-${tam * 0.8}${tam * 0.1}c0 ${tam * 0.45} ${tam * 0.55} ${tam * 0.7} ${tam * 0.8} ${tam * 0.95}c${tam * 0.25}-${tam * 0.25} ${tam * 0.8}-${tam * 0.5} ${tam * 0.8}-${tam * 0.95}c0-${tam * 0.5}-${tam * 0.7}-${tam * 0.6}-${tam * 0.8}-${tam * 0.1}z`}
        fill={color}
      />
    </g>
  );
}

function Nube({ x, y, escala = 1, opacidad = 0.85 }: { x: number; y: number; escala?: number; opacidad?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`} opacity={opacidad}>
      <g className="animate-drift">
        <ellipse cx="0" cy="0" rx="34" ry="12" fill="#FFFDFB" />
        <circle cx="-12" cy="-8" r="13" fill="#FFFDFB" />
        <circle cx="10" cy="-12" r="16" fill="#FFFDFB" />
      </g>
    </g>
  );
}

/**
 * Escena de portada: una abuelita y un abuelito saludando bajo un sol de
 * atardecer, con el grillo entre ellos. Para la pantalla de inicio.
 */
export function EscenaPortada({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 460 290" role="img" aria-label="Una abuelita y un abuelito saludan junto a Griyo, el grillo" className={className}>
      <circle cx="230" cy="150" r="118" fill="#F6B67A" opacity="0.45" />
      <circle cx="230" cy="150" r="84" fill="#F5B76C" opacity="0.5" />
      <Nube x={70} y={60} escala={0.9} />
      <Nube x={392} y={96} escala={0.7} opacidad={0.7} />
      <Corazon x={120} y={64} tam={16} retraso="0.4s" />
      <Corazon x={338} y={50} tam={13} color="#E2883A" retraso="1.2s" />
      <Corazon x={250} y={30} tam={11} color="#B29FC9" retraso="2s" />
      <ellipse cx="230" cy="282" rx="210" ry="22" fill="#D9C4AC" opacity="0.7" />
      <Abuela x={24} y={52} width={196} height={225} saludando className="animate-bob" />
      <Abuelo x={242} y={62} width={190} height={218} saludando className="animate-bob" />
      <GriyoMascota x={186} y={186} width={90} height={90} estado="feliz" />
    </svg>
  );
}

/**
 * Pareja pequeña para el encabezado de la pantalla del abuelo: se saludan
 * entre sí y con quien abre la aplicación.
 */
export function ParejaSaludando({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 250 150" aria-hidden="true" className={className}>
      <circle cx="125" cy="86" r="62" fill="#F6B67A" opacity="0.35" />
      <Corazon x={118} y={14} tam={12} retraso="0.3s" />
      <Abuela x={0} y={14} width={128} height={146} saludando />
      <Abuelo x={118} y={20} width={124} height={141} saludando />
    </svg>
  );
}

/** Una sola persona, para pantallas de formularios: se elige al azar de forma estable por nombre. */
export function AbuelitoSolo({ tipo, className = "" }: { tipo: "abuela" | "abuelo"; className?: string }) {
  return (
    <div className={className}>
      {tipo === "abuela" ? <Abuela saludando className="w-full h-full" /> : <Abuelo saludando className="w-full h-full" />}
    </div>
  );
}
