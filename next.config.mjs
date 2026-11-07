/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: `next build` produces `out/` as a plain static site.
  output: 'export',
  images: { unoptimized: true },
  transpilePackages: ['three'],
};

export default nextConfig;
