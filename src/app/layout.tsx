import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketMind AI — Indian Equity Research & Intelligence",
  description:
    "AI-powered financial research, market analytics, and grounded disclosure intelligence for Indian equities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg text-text">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
