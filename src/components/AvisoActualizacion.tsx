"use client";

import { useActualizacionDisponible } from "@/hooks/useActualizacionDisponible";
import { RefreshIcon } from "@/components/icons";

export default function AvisoActualizacion() {
  const hayActualizacion = useActualizacionDisponible();

  if (!hayActualizacion) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center px-4 pb-4 animate-fade-rise">
      <div className="flex items-center gap-3 bg-dusk-800 text-white rounded-full pl-5 pr-2 py-2 shadow-warm-lg max-w-md">
        <p className="text-base font-medium">Grillo tiene novedades</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 min-h-[44px] bg-ember-600 hover:bg-ember-700 text-white px-4 rounded-full font-semibold transition-colors"
        >
          <RefreshIcon className="w-4 h-4" />
          Actualizar
        </button>
      </div>
    </div>
  );
}
