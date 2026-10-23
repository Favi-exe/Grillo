"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminPanel from "@/components/admin/AdminPanel";
import { cerrarSesionFamiliar, haySesionActiva, suscribirseACambiosDeSesion } from "@/lib/auth/familiarSession";

export default function AdminPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<"cargando" | "sin_sesion" | "listo">("cargando");

  useEffect(() => {
    haySesionActiva().then((activa) => setEstado(activa ? "listo" : "sin_sesion"));
    return suscribirseACambiosDeSesion((activa) => {
      if (!activa) router.push("/login");
    });
  }, [router]);

  useEffect(() => {
    if (estado === "sin_sesion") router.push("/login");
  }, [estado, router]);

  if (estado !== "listo") return null;

  return (
    <main className="min-h-screen bg-sand-200 px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <AdminPanel
          onSalir={async () => {
            await cerrarSesionFamiliar();
            router.push("/login");
          }}
        />
      </div>
    </main>
  );
}
