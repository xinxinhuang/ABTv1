import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { UserContextProvider } from '@/hooks/useUser';
import RealtimeChallengeNotifier from '@/components/game/RealtimeChallengeNotifier';
import { Header } from '@/components/layout/Header';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "A Boring TCG - Collect, Battle, Win",
  description: "Collect unique digital cards, battle with friends, and climb the leaderboards in this exciting card game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserContextProvider>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster position="top-center" richColors />
          <RealtimeChallengeNotifier />
        </UserContextProvider>
      </body>
    </html>
  );
}
