/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@deck.gl',
    'deck.gl',
    '@luma.gl',
    '@math.gl',
    '@loaders.gl',
    '@probe.gl',
  ],
  experimental: {
    esmExternals: 'loose',
  },
};

export default nextConfig;
