import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Permit the HTTPS Instagram test tunnel to access development resources and HMR.
  allowedDevOrigins: ['no.rupakbasnet.com.np'],
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: fileURLToPath(new URL('../../', import.meta.url)) },
};

export default nextConfig;
