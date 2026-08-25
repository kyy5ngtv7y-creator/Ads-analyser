import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrandSpot – Der eine Werbeplatz, den sich Brands klauen",
  description:
    "Ein einziger Spot. Die Brand, die am meisten zahlt, gehört er – bis sie überboten wird. Startpreis: $1.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
