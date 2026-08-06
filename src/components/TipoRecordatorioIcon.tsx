import { memo } from "react";
import { PillIcon, DropletIcon, StethoscopeIcon, CalendarIcon, PinIcon } from "@/components/icons";
import type { TipoRecordatorio } from "@/lib/types";

export const TIPO_INFO: Record<TipoRecordatorio, { label: string; bg: string; fg: string }> = {
  medicamento: { label: "Medicamento", bg: "bg-ember-100", fg: "text-ember-700" },
  agua: { label: "Agua", bg: "bg-dusk-100", fg: "text-dusk-700" },
  cita: { label: "Cita médica", bg: "bg-clay-400/20", fg: "text-clay-600" },
  evento: { label: "Evento familiar", bg: "bg-gold-400/25", fg: "text-gold-600" },
  otro: { label: "Otro", bg: "bg-sand-300", fg: "text-sand-800" },
};

/** Ícono consistente (mismo set de línea) por tipo de recordatorio — sin depender de emoji. */
export const TipoRecordatorioIcon = memo(function TipoRecordatorioIcon({
  tipo,
  className = "w-5 h-5",
}: {
  tipo: TipoRecordatorio;
  className?: string;
}) {
  switch (tipo) {
    case "medicamento":
      return <PillIcon className={className} />;
    case "agua":
      return <DropletIcon className={className} />;
    case "cita":
      return <StethoscopeIcon className={className} />;
    case "evento":
      return <CalendarIcon className={className} />;
    default:
      return <PinIcon className={className} />;
  }
});
