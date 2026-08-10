import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@loop/db", "@loop/ui"],
};

export default nextConfig;
