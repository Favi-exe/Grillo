import type { ClimaInfo } from "@/lib/types";

const MOCK_CLIMAS: Omit<ClimaInfo, "fuente" | "ciudad">[] = [
  { temperatura: 22, descripcion: "soleado", sensacion_termica: 23 },
  { temperatura: 18, descripcion: "parcialmente nublado", sensacion_termica: 17 },
  { temperatura: 15, descripcion: "lluvia ligera", sensacion_termica: 13 },
  { temperatura: 27, descripcion: "despejado", sensacion_termica: 29 },
  { temperatura: 12, descripcion: "fresco y ventoso", sensacion_termica: 9 },
];

export function isWeatherConfigured(): boolean {
  return Boolean(process.env.OPENWEATHER_API_KEY);
}

export async function getClima(ciudad = "Buenos Aires"): Promise<ClimaInfo> {
  if (isWeatherConfigured()) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        ciudad
      )}&units=metric&lang=es&appid=${process.env.OPENWEATHER_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OpenWeather respondió ${res.status}`);
      const data = await res.json();
      return {
        ciudad,
        temperatura: Math.round(data.main.temp),
        descripcion: data.weather?.[0]?.description ?? "sin datos",
        sensacion_termica: Math.round(data.main.feels_like),
        fuente: "real",
      };
    } catch (err) {
      console.error("[weather] fallo API real, usando mock:", err);
    }
  }

  const base = MOCK_CLIMAS[Math.floor(Math.random() * MOCK_CLIMAS.length)];
  return { ciudad, ...base, fuente: "mock" };
}
