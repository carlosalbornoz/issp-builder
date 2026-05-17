import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.111.159.52"],
  async redirects() {
    return [
      {
        source: "/uacs",
        destination: "/uacs/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
