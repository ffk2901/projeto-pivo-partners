"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // No sidebar for login and portal routes
  const noSidebar = pathname.startsWith("/login") || pathname.startsWith("/portal");

  if (noSidebar) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </>
  );
}
