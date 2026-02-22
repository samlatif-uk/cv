import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import { getCurrentUsername } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  title: "Craftfolio",
  description:
    "Craftfolio is a professional network with feed, people discovery, and messaging.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [users, currentUsername] = await Promise.all([
    prisma.user.findMany({
      select: { username: true, name: true },
      orderBy: { name: "asc" },
    }),
    getCurrentUsername(),
  ]);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="cv-nav border-b">
          <AppNav users={users} currentUsername={currentUsername} />
        </header>
        {children}
      </body>
    </html>
  );
}
