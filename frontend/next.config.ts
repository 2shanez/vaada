import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

// Sentry config options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,
  
  // Upload source maps to Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Only upload in production
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
