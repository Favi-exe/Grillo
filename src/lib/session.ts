"use client";

import type { Rol } from "@/lib/types";

export interface Sesion {
  usuarioId: string;
  nombre: string;
  rol: Rol;
  abueloId: string;
  abueloNombre: string;
}

const KEY = "grillo_sesion";

export function guardarSesion(sesion: Sesion) {
  localStorage.setItem(KEY, JSON.stringify(sesion));
}

export function obtenerSesion(): Sesion | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Sesion;
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  localStorage.removeItem(KEY);
}
