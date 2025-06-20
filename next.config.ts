
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    const scriptSrcDirectives = ["'self'", "https://cdnjs.cloudflare.com"];
    if (process.env.NODE_ENV === "development") {
      scriptSrcDirectives.push("'unsafe-eval'");
      scriptSrcDirectives.push("'unsafe-inline'");
    }

    const cspHeader = [
      `default-src 'self'`,
      `script-src ${scriptSrcDirectives.join(' ')}`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: https://placehold.co`,
      `object-src 'self' blob:`, // For viewing PDFs from blob URLs
      `worker-src 'self' blob: https://cdnjs.cloudflare.com`, // Allow worker scripts from self, blob, and CDN
      `connect-src 'self' https://generativelanguage.googleapis.com https://firebasehosting.googleapis.com https://cdnjs.cloudflare.com`, // For Genkit, Firebase, and CDN resources
    ].join('; ');

    return [
      {
        source: '/(.*)', // Apply CSP to all routes
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(), // Replace multiple spaces with single
          },
        ],
      },
    ];
  },
};

export default nextConfig;
