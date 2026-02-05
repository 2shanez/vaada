import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compress responses
  compress: true,
  
  // Optimize builds
  reactStrictMode: true,
  
  // Minimize powered-by header
  poweredByHeader: false,

  // Experimental optimizations
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;
