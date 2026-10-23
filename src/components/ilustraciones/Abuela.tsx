import type { SVGProps } from "react";

/**
 * Ilustración de una abuelita sonriente (dibujo propio de Griyo, estilo plano
 * con la paleta de la app). `saludando` mueve el brazo; los ojos parpadean solos.
 * Decorativa: va oculta para lectores de pantalla.
 */
export default function Abuela({
  saludando = false,
  ...props
}: { saludando?: boolean } & SVGProps<SVGSVGElement>) {
  const ojo = { transformBox: "fill-box" as const, transformOrigin: "center" };
  return (
    <svg viewBox="0 0 200 230" aria-hidden="true" {...props}>
      {/* pelo de atrás y rodete */}
      <ellipse cx="100" cy="96" rx="53" ry="56" fill="#E4DDEB" />
      <circle cx="100" cy="38" r="21" fill="#E4DDEB" />
      <path d="M86 36c6-8 22-8 28 0M90 46c6-5 14-5 20 0" fill="none" stroke="#CFC1DF" strokeWidth="3" strokeLinecap="round" />
      <circle cx="116" cy="30" r="4" fill="#E8B23D" />

      {/* cuerpo: cardigan, blusa y collar */}
      <path d="M26 230c0-46 30-66 74-66s74 20 74 66z" fill="#7C6A9C" />
      <path d="M100 164l-22 4 22 34 22-34z" fill="#FFF8EF" />
      <path d="M100 164c-8 0-16 2-22 4" fill="none" stroke="#B29FC9" strokeWidth="3" strokeLinecap="round" />
      <g fill="#FFFDFB" stroke="#D9C4AC" strokeWidth="1">
        <circle cx="84" cy="176" r="3.4" />
        <circle cx="89" cy="183" r="3.4" />
        <circle cx="96" cy="188" r="3.4" />
        <circle cx="104" cy="188" r="3.4" />
        <circle cx="111" cy="183" r="3.4" />
        <circle cx="116" cy="176" r="3.4" />
      </g>
      <circle cx="68" cy="212" r="3" fill="#B29FC9" />
      <circle cx="132" cy="212" r="3" fill="#B29FC9" />

      {/* cuello y cabeza */}
      <rect x="88" y="140" width="24" height="30" rx="10" fill="#EDBF99" />
      <circle cx="60" cy="110" r="7.5" fill="#EDBF99" />
      <circle cx="140" cy="110" r="7.5" fill="#EDBF99" />
      <circle cx="60" cy="122" r="3" fill="#E8B23D" />
      <circle cx="140" cy="122" r="3" fill="#E8B23D" />
      <ellipse cx="100" cy="106" rx="40" ry="46" fill="#F6D2B0" />

      {/* flequillo */}
      <path d="M59 100c-3-34 18-48 41-48s44 14 41 48c-8-18-22-27-41-27S67 82 59 100z" fill="#E4DDEB" />

      {/* mejillas, nariz, sonrisa */}
      <circle cx="73" cy="126" r="8" fill="#F5B76C" opacity="0.45" />
      <circle cx="127" cy="126" r="8" fill="#F5B76C" opacity="0.45" />
      <path d="M100 112c-4 9-3 11 2 12" fill="none" stroke="#D99A72" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M84 131q16 15 32 0q-16 6-32 0z" fill="#FFFDFB" />
      <path d="M84 131q16 16 32 0" fill="none" stroke="#A8571B" strokeWidth="3.5" strokeLinecap="round" />

      {/* ojos con lentes */}
      <g className="animate-blink" style={ojo}>
        <ellipse cx="85" cy="108" rx="4.5" ry="5.5" fill="#3A2A2E" />
        <circle cx="86.6" cy="106" r="1.5" fill="#fff" />
      </g>
      <g className="animate-blink" style={ojo}>
        <ellipse cx="115" cy="108" rx="4.5" ry="5.5" fill="#3A2A2E" />
        <circle cx="116.6" cy="106" r="1.5" fill="#fff" />
      </g>
      <g fill="none" stroke="#C96B22" strokeWidth="3">
        <circle cx="85" cy="108" r="13" />
        <circle cx="115" cy="108" r="13" />
        <path d="M98 106q2-3 4 0" strokeLinecap="round" />
      </g>
      <path d="M76 94q9-6 18 0M106 94q9-6 18 0" fill="none" stroke="#B5A08A" strokeWidth="3" strokeLinecap="round" />
      <path d="M68 112l-5 2M68 116l-5 4M132 112l5 2M132 116l5 4" stroke="#D99A72" strokeWidth="1.6" strokeLinecap="round" />

      {/* brazo que saluda */}
      <g
        className={saludando ? "animate-wave-hand" : undefined}
        style={{ transformBox: "view-box", transformOrigin: "150px 190px" }}
      >
        <path d="M150 192q24-18 24-60" fill="none" stroke="#7C6A9C" strokeWidth="24" strokeLinecap="round" />
        <circle cx="174" cy="124" r="13" fill="#F6D2B0" />
        <ellipse cx="163" cy="128" rx="4.5" ry="8" fill="#F6D2B0" transform="rotate(-30 163 128)" />
        <path d="M168 112v-8M175 110v-9M182 113v-7" stroke="#F6D2B0" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
