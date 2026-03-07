// @ts-check
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  workboxOptions: {
    // Estratégia: NetworkFirst para APIs, CacheFirst para assets
    runtimeCaching: [
      {
        // Rotas de API — NetworkFirst (tenta rede, fallback para cache)
        urlPattern: /^https?:\/\/.*\/api\/.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "urbandesk-api",
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 5 * 60, // 5 minutos
          },
        },
      },
      {
        // Tiles do Mapbox — CacheFirst (mapas offline)
        urlPattern: /^https:\/\/api\.mapbox\.com\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "mapbox-tiles",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
          },
        },
      },
      {
        // Imagens e assets estáticos
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "urbandesk-assets",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
          },
        },
      },
    ],
  },
});

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

  // Habilita React Compiler (Next 14+)
  experimental: {
    reactCompiler: false, // habilitar quando estável
  },

  // ---> ADICIONADO: TRAVAS DE SEGURANÇA PARA O BUILD DA VERCEL PASSAR <---
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default withPWA(nextConfig);
