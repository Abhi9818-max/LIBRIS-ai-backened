import type {Metadata} from 'next';
import { use } from 'react'; // <-- Import use
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: 'BookShelf App',
  description: 'Upload and manage your book collection.',
};

export default function RootLayout({
  children,
  params,
  searchParams
}: Readonly<{
  children: React.ReactNode;
  params?: { [key: string]: string | string[] | undefined };
  searchParams?: { [key: string]: string | string[] | undefined };
}>) {
  // Attempt to "unwrap" params and searchParams if they are passed.
  // This is based on Next.js guidance for accessing/enumerating them in Server Components.
  if (params) {
    try { use(params); } catch (e) {
      // Silently catch if params is not a "use-able" value in this context,
      // which might happen if Next.js doesn't make it use-able at the layout level
      // unless it's a dynamic route layout.
    }
  }
  if (searchParams) {
    try { use(searchParams); } catch (e) {
      // Silently catch, same reasoning as above.
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <ThemeProvider
          defaultTheme="light"
          storageKey="bookshelf-theme"
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
