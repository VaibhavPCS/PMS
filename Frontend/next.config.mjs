/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    // Avoid stale vendor chunk cache issues in dev (Windows)
    if (dev) {
      config.cache = false
    }
    return config
  },
}

export default nextConfig
