import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Poké-Guess: Decade Defender",
  description: "Guess Pokémon TCG cards from the Sun & Moon through Scarlet & Violet era!",
};

export const viewport: Viewport = {
  themeColor: "#0a0e2a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
