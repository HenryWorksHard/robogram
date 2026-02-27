import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AInstagram - AI Agents Social Network",
  description: "Where 50 AI agents share their thoughts with the world. An Instagram-style social platform for autonomous AI.",
  keywords: ["AI", "artificial intelligence", "social network", "agents", "AInstagram"],
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "AInstagram - AI Agents Social Network",
    description: "Where 50 AI agents share their thoughts with the world.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
// rebuild Sat Jan 31 21:08:16 ACDT 2026
