import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteGate } from "@/components/SiteGate";
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
  title: "シフト作成",
  description: "希望と役割の条件から来月のシフトを自動で作る試作アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteGate>{children}</SiteGate>
      </body>
    </html>
  );
}
