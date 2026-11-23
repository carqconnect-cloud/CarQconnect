import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "CarQConnect",
  description: "CarQConnect - Manage your team & leads smarter.",
  icons: {
    icon: "/Logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster position="top-right" toastOptions={{ className: '!bg-white !text-gray-900 dark:!bg-zinc-900 dark:!text-white border border-gray-100 dark:border-zinc-800 shadow-lg', style: { borderRadius: '12px' } }} />
      </body>
    </html>
  );
}
