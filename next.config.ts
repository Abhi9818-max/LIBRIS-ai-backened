
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
    // Get the auth domain from environment variables to use in the CSP.
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "";

    const scriptSrcDirectives = [
      "'self'",
      "https://apis.google.com", // For Google Sign-In script
      "https://www.gstatic.com", // For Firebase JS SDK
      "https://cdnjs.cloudflare.com", // For pdf.js worker
    ];
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
      `media-src 'self' data: blob:`, // Allow audio from data URIs and blobs
      `object-src 'self' blob:`, // For viewing PDFs from blob URLs
      `worker-src 'self' blob: https://cdnjs.cloudflare.com`, // Allow worker scripts from self, blob, and CDN
      // Allow iframes from your Firebase auth domain for the sign-in popup
      `frame-src 'self' ${authDomain ? `https://${authDomain}` : ''}`,
      // Explicitly list all required domains for auth and other services
      `connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://generativelanguage.googleapis.com https://firebasehosting.googleapis.com https://cdnjs.cloudflare.com`,
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
