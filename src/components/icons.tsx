import type { SVGProps } from "react";

/**
 * Set de íconos propio de Grillo — todos comparten el mismo grosor de línea
 * (1.8), extremos y uniones redondeados, sin relleno. Evita mezclar estilos
 * (geométrico/emoji/relleno) para que la interfaz se lea como un solo
 * sistema. SVG inline: cero requests de red, tree-shakeable.
 */

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function Base({ className = "w-6 h-6", children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </Base>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 4.2 1.4 5.6 2 6.2H4c.6-.6 2-2 2-6.2Z" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
    </Base>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 20s-7.1-4.35-9.5-8.6C.8 7.7 2.4 4 6.2 4c2 0 3.4 1.2 3.9 2.2C10.6 5.2 12 4 14 4c3.8 0 5.4 3.7 3.7 7.4C15.1 15.65 12 20 12 20Z" />
    </Base>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
    </Base>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="8.5" cy="8" r="3" />
      <path d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M14.8 20c.2-2.7 2-4.8 4.5-4.8 2 0 3.7 1.3 4.2 3.3" />
    </Base>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <line x1="12" y1="2.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="21.5" y2="12" />
      <line x1="5" y1="5" x2="6.8" y2="6.8" />
      <line x1="17.2" y1="17.2" x2="19" y2="19" />
      <line x1="19" y1="5" x2="17.2" y2="6.8" />
      <line x1="6.8" y1="17.2" x2="5" y2="19" />
    </Base>
  );
}

export function PillIcon(props: IconProps) {
  return (
    <Base {...props}>
      <g transform="rotate(45 12 12)">
        <rect x="4" y="9" width="16" height="6" rx="3" />
        <line x1="12" y1="9" x2="12" y2="15" />
      </g>
    </Base>
  );
}

export function DropletIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3c4 5 7 8.7 7 12.2A7 7 0 0 1 5 15.2C5 11.7 8 8 12 3z" />
    </Base>
  );
}

export function StethoscopeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 3v6a4 4 0 0 0 8 0V3" />
      <path d="M9 13v1.5a5 5 0 0 0 10 0V12" />
      <circle cx="19" cy="9" r="2" />
    </Base>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
      <line x1="3.5" y1="10" x2="20.5" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </Base>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </Base>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M21.5 2.5 11 13" />
      <path d="M21.5 2.5 14.8 21 11 13l-8-3.8 18.5-6.7Z" />
    </Base>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Base>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Base>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </Base>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="6" y="4" width="4" height="16" rx="1.2" />
      <rect x="14" y="4" width="4" height="16" rx="1.2" />
    </Base>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7.5 4.5 20 12 7.5 19.5v-15Z" />
    </Base>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 12.5 9.5 18 20 6" />
    </Base>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3 2 20h20L12 3Z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <line x1="12" y1="17" x2="12" y2="17.2" />
    </Base>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.3" y2="16.3" />
    </Base>
  );
}

/**
 * Marca de Grillo — un grillo estilizado y redondeado, mismo lenguaje de
 * trazo que el resto del set. Se usa como firma de marca (header, favicon,
 * pantalla de bienvenida), nunca como ícono funcional suelto.
 */
export function CricketMark(props: IconProps) {
  return (
    <Base viewBox="0 0 32 32" {...props}>
      <circle cx="9" cy="13" r="3.4" />
      <path d="M6.5 10.5 3.5 6.5" />
      <path d="M9.5 9.5 8 5" />
      <ellipse cx="16.5" cy="16" rx="7.6" ry="5.2" transform="rotate(-8 16.5 16)" />
      <path d="M13 19c.5 2 .3 4.3-1.2 6" />
      <path d="M19 20c1.4 1 1.8 3.3 1 5.3" />
      <path d="M22.5 17.5c2.6.4 4.6 2.5 4.8 5.2" />
      <path d="M27.3 22.7c-.2 1.8-1.6 3.3-3.4 3.7" />
    </Base>
  );
}
