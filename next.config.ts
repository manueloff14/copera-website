import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // El dev server bloquea /_next/* y HMR desde otros origenes; el tunel de Cloudflare cambia de subdominio al reiniciar.
  allowedDevOrigins: ["exceed-lips-bars-gravity.trycloudflare.com", "*.trycloudflare.com"],
}

export default nextConfig
