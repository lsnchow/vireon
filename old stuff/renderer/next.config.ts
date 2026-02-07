import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.sketchfab.com",
      },
      {
        protocol: "https",
        hostname: "static.sketchfab.com",
      },
    ],
  },
};

export default nextConfig;
