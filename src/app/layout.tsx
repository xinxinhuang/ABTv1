import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/theme.css";
import { ThemeProvider } from '@/providers/ThemeProvider';
import { UserContextProvider } from '@/hooks/useUser';
import { Header } from '@/components/layout/Header';
import { GlobalChallengeNotifications } from '@/components/game/GlobalChallengeNotifications';

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
        <ThemeProvider defaultTheme="dark">
          <UserContextProvider>
            <Header />
            <main className="content-height">
              {children}
            </main>
            <Toaster />
            <GlobalChallengeNotifications />
          </UserContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
