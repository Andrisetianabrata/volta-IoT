import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/dashboard/:path*", destination: "/dashboards/:path*", permanent: false },
      { source: "/provision", destination: "/devices", permanent: false },
    ];
  },
};

export default nextConfig;
