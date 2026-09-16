import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toaster";
import { BottomNav } from "@/components/layout/bottom-nav";
import { RoleProviderBlock } from "@/components/layout/role-provider-block";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RT Finance — Pembukuan RT Modern",
  description:
    "Aplikasi pembukuan keuangan RT yang simpel, modern, dan intuitif. Kelola Kantong, transaksi, dan laporan tanpa Excel yang rumit.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RTFinance",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#232323" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RoleProviderBlock>
          <ToastProvider>
            {children}
            <BottomNav />
          </ToastProvider>
        </RoleProviderBlock>
      </body>
    </html>
  );
}
