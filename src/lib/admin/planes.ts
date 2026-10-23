import type { EstadoSuscripcion } from "@/lib/types";

// Los precios son sugeridos (stack de precios de MIFA): al elegir un plan en
// /admin el precio se completa solo, pero siempre se puede editar a mano.
export const PLANES = [
  { id: "piloto", nombre: "Piloto (gratis)", precioSugerido: 0 },
  { id: "low", nombre: "Low", precioSugerido: 19990 },
  { id: "medio", nombre: "Medio", precioSugerido: 49990 },
  { id: "acompanamiento", nombre: "Acompañamiento", precioSugerido: 59990 },
] as const;

export const ESTADOS_SUSCRIPCION: { id: EstadoSuscripcion; nombre: string }[] = [
  { id: "piloto", nombre: "Piloto" },
  { id: "prueba", nombre: "En prueba" },
  { id: "activa", nombre: "Activa (cobrando)" },
  { id: "pausada", nombre: "Pausada" },
  { id: "cancelada", nombre: "Cancelada" },
];

export function nombrePlan(id: string): string {
  return PLANES.find((p) => p.id === id)?.nombre ?? id;
}
