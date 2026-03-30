import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";
import { ToastProvider } from "@/components/ToastProvider";

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
      <body className="bg-md-surface text-md-on_surface min-h-screen flex">
        <ToastProvider>
          <LayoutShell>{children}</LayoutShell>
        </ToastProvider>
      </body>
    </html>
  );
}
