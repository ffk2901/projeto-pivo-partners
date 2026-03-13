"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push("/login");
          return;
        }
        setUserName(data.name || data.email || "");
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-surface-100 text-ink-800">
      <header className="bg-brand-900 border-b border-brand-800/40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-brand-100 tracking-tight">Pivo Partners</h1>
            <p className="text-xs text-brand-400">Client Portal</p>
          </div>
          <div className="flex items-center gap-4">
            {userName && (
              <span className="text-sm text-brand-300">{userName}</span>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs text-brand-300 hover:text-brand-100 border border-brand-700 rounded-lg hover:bg-brand-800/60 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
