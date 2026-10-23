import type { SVGProps } from "react";

/**
 * Ilustración de un abuelito sonriente con boina y bigote (dibujo propio de
 * Griyo, estilo plano con la paleta de la app). `saludando` mueve el brazo.
 */
export default function Abuelo({
  saludando = false,
  ...props
}: { saludando?: boolean } & SVGProps<SVGSVGElement>) {
  const ojo = { transformBox: "fill-box" as const, transformOrigin: "center" };
  return (
    <svg viewBox="0 0 200 230" aria-hidden="true" {...props}>
      {/* cuerpo: chaleco, camisa y corbata */}
      <path d="M26 230c0-46 30-66 74-66s74 20 74 66z" fill="#E2883A" />
      <path d="M100 164l-26 6 26 38 26-38z" fill="#FFF8EF" />
      <path d="M74 170l26 22-4-30z M126 170l-26 22 4-30z" fill="#FFFDFB" stroke="#F3E4D2" strokeWidth="1" />
      <path d="M96 166h8l3 12-7 30-7-30z" fill="#4A3B5C" />
      <g fill="#A8571B">
        <circle cx="64" cy="206" r="3.2" />
        <circle cx="136" cy="206" r="3.2" />
      </g>

      {/* cuello y cabeza */}
      <rect x="88" y="140" width="24" height="30" rx="10" fill="#DDA77C" />
      <circle cx="59" cy="112" r="8" fill="#E8B88C" />
      <circle cx="141" cy="112" r="8" fill="#E8B88C" />
      <ellipse cx="100" cy="106" rx="41" ry="47" fill="#EFC299" />

      {/* canas a los costados y boina */}
      <path d="M60 104c-4-14 0-26 6-34l4 6c-4 8-4 18-2 28zM140 104c4-14 0-26-6-34l-4 6c4 8 4 18 2 28z" fill="#D9D4DE" />
      <ellipse cx="100" cy="64" rx="50" ry="17" fill="#4A3B5C" />
      <path d="M58 66c4-22 22-32 42-32s38 10 42 32c-12-8-26-12-42-12s-30 4-42 12z" fill="#5E4E7B" />
      <circle cx="100" cy="32" r="5" fill="#4A3B5C" />
      <path d="M62 68c10 5 24 8 38 8s28-3 38-8" fill="none" stroke="#362B44" strokeWidth="2" strokeLinecap="round" />

      {/* cejas, mejillas, nariz */}
      <path d="M72 94q10-6 20 0M108 94q10-6 20 0" fill="none" stroke="#D9D4DE" strokeWidth="4" strokeLinecap="round" />
      <circle cx="72" cy="126" r="8" fill="#F5B76C" opacity="0.4" />
      <circle cx="128" cy="126" r="8" fill="#F5B76C" opacity="0.4" />
      <path d="M100 110c-5 10-4 13 3 13" fill="none" stroke="#C98F66" strokeWidth="2.6" strokeLinecap="round" />

      {/* bigote y sonrisa */}
      <path d="M100 126q-6-6-16-3q-3 9 8 9q6 0 8-6zM100 126q6-6 16-3q3 9-8 9q-6 0-8-6z" fill="#D9D4DE" />
      <path d="M88 138q12 8 24 0" fill="none" stroke="#A8571B" strokeWidth="3.2" strokeLinecap="round" />

      {/* ojos con lentes cuadrados */}
      <g className="animate-blink" style={ojo}>
        <ellipse cx="85" cy="108" rx="4.2" ry="5.2" fill="#3A2A2E" />
        <circle cx="86.5" cy="106" r="1.4" fill="#fff" />
      </g>
      <g className="animate-blink" style={ojo}>
        <ellipse cx="115" cy="108" rx="4.2" ry="5.2" fill="#3A2A2E" />
        <circle cx="116.5" cy="106" r="1.4" fill="#fff" />
      </g>
      <g fill="none" stroke="#6E5B54" strokeWidth="3">
        <rect x="70" y="95" width="28" height="24" rx="8" />
        <rect x="102" y="95" width="28" height="24" rx="8" />
        <path d="M98 104h4" strokeLinecap="round" />
      </g>

      {/* brazo que saluda */}
      <g
        className={saludando ? "animate-wave-hand" : undefined}
        style={{ transformBox: "view-box", transformOrigin: "150px 190px" }}
      >
        <path d="M150 192q24-18 24-60" fill="none" stroke="#E2883A" strokeWidth="24" strokeLinecap="round" />
        <circle cx="174" cy="124" r="13" fill="#EFC299" />
        <ellipse cx="163" cy="128" rx="4.5" ry="8" fill="#EFC299" transform="rotate(-30 163 128)" />
        <path d="M168 112v-8M175 110v-9M182 113v-7" stroke="#EFC299" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
