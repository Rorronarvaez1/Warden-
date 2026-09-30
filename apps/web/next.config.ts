import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Los paquetes internos se consumen como TypeScript fuente.
  transpilePackages: ['@warden/shared', '@warden/db'],
};

export default nextConfig;
