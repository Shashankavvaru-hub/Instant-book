import React, { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InstantBook — Book Event Tickets Instantly",
  description: "Discover and book tickets for the best events near you.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "InstantBook",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0f0f14] text-zinc-100 antialiased min-h-screen`}>
        <ServiceWorkerRegistration />
        <Providers>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <main className="w-full py-8">
            <div className="max-w-7xl mx-auto px-4">
              {children}
            </div>
          </main>
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
