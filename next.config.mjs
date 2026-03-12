// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilita output standalone para deploy em container
  output: "standalone",

  images: {
    remotePatterns: [
      // Avatares e logos de prefeituras (armazenados no S3/R2)
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      // Fotos de campo
      {
        protocol: "https",
        hostname: "cdn.urbandesk.com.br",
      },
    ],
  },

  // Headers de segurança
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",        value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // Câmera e GPS necessários para o App de Campo
            value: "camera=self, geolocation=self, microphone=()",
          },
        ],
      },
    ];
  },

  // Variáveis de ambiente expostas ao client
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    NEXT_PUBLIC_APP_URL:      process.env.NEXT_PUBLIC_APP_URL,
  },

};

export default nextConfig;
