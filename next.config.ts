import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  serverExternalPackages: ["puppeteer", "puppeteer-core"],
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1400, 1920, 2048, 3840],
  },
  allowedDevOrigins: ["100.111.159.52"],
  async redirects() {
    return [
      {
        source: "/",
        destination: "/issp",
        permanent: false,
        basePath: false,
      },
      {
        source: "/uacs",
        destination: "/uacs/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
