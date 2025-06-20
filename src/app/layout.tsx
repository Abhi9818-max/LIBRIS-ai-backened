
import type { Metadata } from 'next';
// Removed: import { use } from 'react';
import './globals.css';
// Removed: import { Toaster } from "@/components/ui/toaster";
// Removed: import { ThemeProvider } from "@/components/theme-provider";

// Metadata object is simplified or can be fully removed if needed for extreme debugging
export const metadata: Metadata = {
  title: 'BookShelf App (Layout Debug)',
  description: 'Debugging layout and client-side errors.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
  // params and searchParams removed as 'use' was removed
}>) {
  // Removed: params and searchParams handling with use()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        {/* ThemeProvider and Toaster temporarily removed */}
        {children}
        {/* <Toaster /> */}
      </body>
    </html>
  );
}
