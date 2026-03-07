import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import { getCurrentUsernameSafe } from "@/lib/runtimeSafe";
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
  const currentUsername = await getCurrentUsernameSafe();
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  const linkedInEnabled = Boolean(
    process.env.AUTH_LINKEDIN_ID && process.env.AUTH_LINKEDIN_SECRET,
  );

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="cv-nav border-b">
          <AppNav
            currentUsername={currentUsername}
            googleEnabled={googleEnabled}
            linkedInEnabled={linkedInEnabled}
          />
        </header>
        {children}
      </body>
    </html>
  );
}
