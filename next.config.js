/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Identificador del deploy actual, para que el navegador pueda notar
  // cuando hay una version mas nueva sin tener que recargar a ciegas (ver
  // src/hooks/useActualizacionDisponible.ts + /api/version). Vercel pone
  // VERCEL_GIT_COMMIT_SHA solo; en local (sin ese valor) usamos la hora de
  // arranque, que alcanza para probarlo en dev.
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || `dev-${Date.now()}`,
  },
};

module.exports = nextConfig;
