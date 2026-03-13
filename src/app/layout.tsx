import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "Pivo Partners",
  description: "Internal fundraising consultancy tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-surface-100 text-ink-800 min-h-screen flex">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
