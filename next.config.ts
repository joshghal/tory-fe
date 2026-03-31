import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'static.arkhamintelligence.com',
      },
      {
        hostname: 'coin-images.coingecko.com',
      },
    ],
  },
};

export default nextConfig;
