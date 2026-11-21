import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaManager } from "@/components/PwaManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AP Skill Development LMS | Official Learning Portal",
  description:
    "Learning Management System for Andhra Pradesh Colleges & Institutions",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AP Skill LMS",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F3D2E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-[#0F3D2E] font-sans">
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
