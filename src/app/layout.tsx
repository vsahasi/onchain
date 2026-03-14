import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/providers/wallet-provider";
import { XRPLProvider } from "@/providers/xrpl-provider";
import Navbar from "@/components/layout/Navbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "INFX — Tokenized Inference Credits",
  description: "Buy, sell, and spend AI inference credits on XRPL",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-zinc-950 text-white antialiased`}>
        <WalletProvider>
          <XRPLProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
          </XRPLProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
