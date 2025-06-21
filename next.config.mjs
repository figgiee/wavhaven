/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { 
    serverActions: {
      bodySizeLimit: '150mb', 
    },
  },
  serverExternalPackages: ['fluent-ffmpeg', '@ffmpeg-installer/ffmpeg'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vezltkuoabvigobuaqxc.supabase.co', // Allow Supabase storage
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'gnueyewaqqzaldhyvfgp.supabase.co',
        port: '', // Add empty port string
        pathname: '/storage/v1/object/public/**', // Add specific pathname
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com', // Allow Clerk profile images
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**', // Allow any path on this host
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      // Add other hostnames if needed, e.g., for user profile images
    ],
  },
  async rewrites() {
    return [
      // {
      //   source: "/ingest/static/:path*",
      //   destination: "https://us-assets.i.posthog.com/static/:path*",
      // },
      // {
      //   source: "/ingest/:path*",
      //   destination: "https://us.i.posthog.com/:path*",
      // },
      // {
      //   source: "/ingest/decide",
      //   destination: "https://us.i.posthog.com/decide",
      // },
    ];
  },
  skipTrailingSlashRedirect: true,
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.resolve.fallback = {
  //       ...config.resolve.fallback,
  //       fs: false,
  //     };
  //   }
  //   return config;
  // },
};

export default nextConfig; 