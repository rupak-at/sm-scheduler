import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import { developmentCacheSettings } from './development-cache';

const nextConfig: NextConfig = {
  ...developmentCacheSettings(),
  // Permit the HTTPS Instagram test tunnel to access development resources and HMR.
  allowedDevOrigins: ['no.rupakbasnet.com.np'],
  reactStrictMode: true,
  poweredByHeader: false,
  // A restored development cache reproduced stale-task compiler failures on workspace/media routes.
  experimental: { turbopackFileSystemCacheForDev: false },
  turbopack: { root: fileURLToPath(new URL('../../', import.meta.url)) },
};

export default nextConfig;
