import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trikal/shared", "@trikal/ui"],
};

export default nextConfig;
