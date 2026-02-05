import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#16a34a",
};

export const metadata: Metadata = {
  title: "TodoCook - Votre assistant cuisine",
  description: "Gérez vos recettes, votre garde-manger et votre nutrition",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TodoCook",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            const theme = localStorage.getItem('todocook-theme') || 'light';
            if (theme === 'dark') document.documentElement.classList.add('dark');
          })();
        `}} />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-safe transition-colors">
        <AuthProvider>
          <ThemeProvider>
            <main className="max-w-lg mx-auto safe-area-inset">{children}</main>
            <Navbar />
            <ServiceWorkerRegistrar />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
