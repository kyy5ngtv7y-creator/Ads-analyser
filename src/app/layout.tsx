import type { Metadata } from "next";
import { Instrument_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument-sans",
});

export const metadata: Metadata = {
  title: "Ads·Analyser — Winner oder Flop, bevor du Budget ausgibst",
  description:
    "Analysiert Meta- und TikTok-Ads vor dem Schalten: Winner-Score in Prozent, 8 Kriterien, konkrete Fixes und Copy-Rewrites.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${spaceGrotesk.variable} ${instrumentSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
