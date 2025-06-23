
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
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  devIndicators: {
    allowedDevOrigins: [
      '6000-firebase-studio-1750350116247.cluster-xpmcxs2fjnhg6xvn446ubtgpio.cloudworkstations.dev',
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
      `img-src 'self' data: https://placehold.co https://lh3.googleusercontent.com`,
      `object-src 'self' blob:`, // For viewing PDFs from blob URLs
      `worker-src 'self' blob: https://cdnjs.cloudflare.com`, // Allow worker scripts from self, blob, and CDN
      `connect-src 'self' https://generativelanguage.googleapis.com https://firebasehosting.googleapis.com https://cdnjs.cloudflare.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com`,
    ].join('; ');

    return [
      {
        source: '/(.*)', // Apply CSP to all routes
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
