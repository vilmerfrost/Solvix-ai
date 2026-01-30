import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Ökar gränsen till 10MB
    },
  },
  
  typescript: {
    ignoreBuildErrors: true, // Skip type checking during build
  },
  
  // Image optimization
  images: {
    unoptimized: true, // Disable image optimization for faster builds
  },
};

export default nextConfig;