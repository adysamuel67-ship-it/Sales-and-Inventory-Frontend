/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.optimization = config.optimization || {}
    config.optimization.splitChunks = false
    return config
  },
}
module.exports = nextConfig
