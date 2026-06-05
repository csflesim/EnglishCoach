import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Reflex Coach — V0",
  description: "自用 MVP 介面預覽 (Self-Use MVP Preview)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-ink-950 bg-grid antialiased">
        {children}
      </body>
    </html>
  );
}
