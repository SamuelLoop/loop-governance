import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Session 7 (scaffold) — admin had no transpilePackages config at all
  // before this (eng-plan task T4.7). @loop/ui ships raw TS/next/font/
  // local source, same as @loop/db; both need Next to transpile them.
  transpilePackages: ["@loop/ui"],
};

export default nextConfig;
