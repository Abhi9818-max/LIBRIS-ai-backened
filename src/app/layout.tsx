
import type { Metadata } from 'next';
import './globals.css';

// Metadata export temporarily removed for debugging
// export const metadata: Metadata = {
//   title: 'BookShelf App (Layout Debug)',
//   description: 'Debugging layout and client-side errors.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Font links temporarily removed for debugging CSP and connection issues */}
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
