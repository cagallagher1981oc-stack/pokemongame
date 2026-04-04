import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poké-Guess: Decade Defender",
  description: "Guess Pokémon TCG cards from the Sun & Moon through Scarlet & Violet era!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
