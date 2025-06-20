
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
    const scriptSrcDirectives = ["'self'"];
    if (process.env.NODE_ENV === "development") {
      scriptSrcDirectives.push("'unsafe-eval'");
      scriptSrcDirectives.push("'unsafe-inline'"); // Added for development to allow inline scripts
    }

    const cspHeader = [
      `default-src 'self'`,
      `script-src ${scriptSrcDirectives.join(' ')}`,
      // ShadCN UI and global styles might use inline styles
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: https://placehold.co`,
      // This is key for allowing PDFs from blob URLs to be displayed
      `object-src 'self' blob:`,
      // For Genkit calls to Google AI
      `connect-src 'self' https://generativelanguage.googleapis.com`,
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
