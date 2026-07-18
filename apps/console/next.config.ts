import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@loop/db"],
};

export default nextConfig;
