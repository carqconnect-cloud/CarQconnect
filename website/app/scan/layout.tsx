import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "../(site)/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vehicle Contact | CarQConnect",
  description: "Scan result for a CarQConnect-protected vehicle.",
  robots: { index: false, follow: false },
};

export default function ScanRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="font-body antialiased bg-[#090E17] text-white min-h-screen">{children}</body>
    </html>
  );
}
