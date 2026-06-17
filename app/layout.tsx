import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/shared/Toast";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Agent Pipeline Mastery",
  description: "A cross-device learning tracker for agent-pipeline orchestration.",
  manifest: "/manifest.json",
  applicationName: "Pipeline",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pipeline",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E1116",
  width: "device-width",
  initialScale: 1,
  // Intentionally allow pinch-zoom (no maximumScale/userScalable) for a11y.
  viewportFit: "cover",
};

/**
 * Establishes the root application shell with toast notifications and service worker support.
 *
 * @returns The root HTML document structure configured with the specified language and body content.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
