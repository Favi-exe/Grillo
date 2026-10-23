import type { SVGProps } from "react";

export type EstadoMascota = "quieto" | "idle" | "escuchando" | "pensando" | "hablando" | "feliz";

/**
 * Griyo, el grillo: la mascota de la app. Reacciona al estado de la charla:
 * en reposo respira y salta de vez en cuando, escuchando mueve las antenas,
 * pensando se inclina, hablando abre y cierra la boca y bate las alas.
 */
export default function GriyoMascota({
  estado = "idle",
  ...props
}: { estado?: EstadoMascota } & SVGProps<SVGSVGElement>) {
  const base = { transformBox: "fill-box" as const };
  const cuerpoAnim =
    estado === "quieto"
      ? undefined
      : estado === "hablando"
      ? "animate-bob-fast"
      : estado === "escuchando"
        ? "animate-breathe"
        : estado === "pensando"
          ? undefined
          : estado === "feliz"
            ? "animate-hop"
            : "animate-hop";
  const inclinar = estado === "pensando" ? "rotate(-7 80 100)" : estado === "escuchando" ? "rotate(4 80 100)" : undefined;
  const antena = estado === "escuchando" ? "animate-antenna-twitch" : estado === "idle" ? "animate-bob" : undefined;

  return (
    <svg viewBox="0 0 160 160" aria-hidden="true" {...props}>
      <g className={cuerpoAnim} style={{ ...base, transformOrigin: "center bottom" }}>
        <g transform={inclinar}>
          {/* alas */}
          <g
            className={estado === "hablando" ? "animate-flutter" : undefined}
            style={{ ...base, transformOrigin: "80px 96px" }}
          >
            <ellipse cx="40" cy="104" rx="16" ry="26" fill="#B29FC9" transform="rotate(18 40 104)" />
            <ellipse cx="120" cy="104" rx="16" ry="26" fill="#B29FC9" transform="rotate(-18 120 104)" />
          </g>

          {/* patitas */}
          <g fill="none" stroke="#A8571B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M52 134l-12 14 8 4" />
            <path d="M108 134l12 14-8 4" />
            <path d="M66 142l-4 14M94 142l4 14" />
          </g>

          {/* antenas */}
          <g
            className={antena}
            style={{ ...base, transformOrigin: "62px 52px" }}
            fill="none"
            stroke="#A8571B"
            strokeWidth="4"
            strokeLinecap="round"
          >
            <path d="M62 54C52 30 38 22 26 26" />
            <circle cx="26" cy="26" r="4.5" fill="#F5B76C" stroke="none" />
          </g>
          <g
            className={antena}
            style={{ ...base, transformOrigin: "98px 52px", animationDelay: "0.25s" }}
            fill="none"
            stroke="#A8571B"
            strokeWidth="4"
            strokeLinecap="round"
          >
            <path d="M98 54C108 30 122 22 134 26" />
            <circle cx="134" cy="26" r="4.5" fill="#F5B76C" stroke="none" />
          </g>

          {/* cuerpo y pancita */}
          <ellipse cx="80" cy="100" rx="48" ry="44" fill="#EC9C4C" />
          <ellipse cx="80" cy="114" rx="31" ry="25" fill="#FDE6C9" />
          <path d="M44 84c8-18 26-26 36-26s28 8 36 26" fill="none" stroke="#E2883A" strokeWidth="3" strokeLinecap="round" opacity="0.6" />

          {/* cachetes y ojos */}
          <circle cx="50" cy="104" r="7" fill="#F5B76C" opacity="0.7" />
          <circle cx="110" cy="104" r="7" fill="#F5B76C" opacity="0.7" />
          <g className="animate-blink" style={{ ...base, transformOrigin: "center" }}>
            <circle cx="64" cy="88" r="14" fill="#fff" />
            <circle cx="96" cy="88" r="14" fill="#fff" />
            <circle cx={estado === "pensando" ? 68 : 65} cy={estado === "pensando" ? 83 : 90} r="6.5" fill="#3A2A2E" />
            <circle cx={estado === "pensando" ? 100 : 97} cy={estado === "pensando" ? 83 : 90} r="6.5" fill="#3A2A2E" />
            <circle cx={estado === "pensando" ? 70 : 67} cy={estado === "pensando" ? 81 : 88} r="2" fill="#fff" />
            <circle cx={estado === "pensando" ? 102 : 99} cy={estado === "pensando" ? 81 : 88} r="2" fill="#fff" />
          </g>

          {/* boca */}
          {estado === "hablando" ? (
            <ellipse
              className="animate-mouth-talk"
              style={{ ...base, transformOrigin: "center" }}
              cx="80"
              cy="112"
              rx="9"
              ry="8"
              fill="#63330F"
            />
          ) : estado === "escuchando" ? (
            <ellipse cx="80" cy="112" rx="5" ry="4" fill="#63330F" />
          ) : (
            <path d="M66 108q14 14 28 0" fill="none" stroke="#63330F" strokeWidth="4" strokeLinecap="round" />
          )}
        </g>
      </g>

      {estado === "pensando" && (
        <g fill="#7C6A9C">
          <circle className="animate-think-dot" cx="124" cy="40" r="4" />
          <circle className="animate-think-dot stagger-1" cx="136" cy="30" r="5" />
          <circle className="animate-think-dot stagger-2" cx="150" cy="18" r="6" />
        </g>
      )}
      {estado === "escuchando" && (
        <g fill="none" stroke="#F5B76C" strokeWidth="3.5" strokeLinecap="round">
          <path className="animate-twinkle" d="M12 60q-6 8 0 16" />
          <path className="animate-twinkle stagger-2" d="M5 54q-11 14 0 28" />
          <path className="animate-twinkle" d="M148 60q6 8 0 16" />
          <path className="animate-twinkle stagger-2" d="M155 54q11 14 0 28" />
        </g>
      )}
    </svg>
  );
}
