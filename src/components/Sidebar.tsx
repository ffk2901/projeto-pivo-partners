"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/startups", label: "Startups", icon: "startups" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/investors", label: "Investors\nDirectory", icon: "investors" },
  { href: "/admin/users", label: "User\nManagement", icon: "users" },
];

function NavIcon({ name, className }: { name: string; className?: string }) {
  const cn = className || "w-5 h-5";
  switch (name) {
    case "dashboard":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
        </svg>
      );
    case "startups":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      );
    case "projects":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
        </svg>
      );
    case "investors":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      );
    case "users":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProfileMenu]);

  return (
    <aside className="w-56 bg-md-on_surface min-h-screen flex flex-col flex-shrink-0">
      {/* Brand header */}
      <div className="px-5 py-5">
        <h1 className="text-lg font-bold text-md-primary_container tracking-tight">Pivo Partners</h1>
        <p className="label-sm text-md-on_surface_variant mt-0.5" style={{ color: "#9a8e85" }}>FUNDRAISING CRM</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl label-lg transition-all ${
                isActive
                  ? "bg-md-primary_container/15 text-white border-l-4 border-md-primary_container -ml-0.5 pl-2.5"
                  : "text-[#9a8e85] hover:bg-white/5 hover:text-white/80"
              }`}
            >
              <NavIcon name={item.icon} className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-md-primary_container" : ""}`} />
              <span className="whitespace-pre-line leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-3">
        {/* Golden CTA button */}
        <Link
          href="/investors"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl font-semibold text-sm text-md-on_primary bg-gradient-to-r from-md-primary to-md-primary_container hover:opacity-90 transition-opacity shadow-ambient"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Prospect
        </Link>

        {/* User profile row */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-2xl hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-md-primary_container flex items-center justify-center text-xs font-bold text-md-on_primary flex-shrink-0">
              AP
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-xs font-medium text-white/90 truncate">Alexandre Pivo</p>
              <p className="text-[10px] text-[#9a8e85]">Managing Partner</p>
            </div>
          </button>
          {showProfileMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-md-surface_container_lowest rounded-2xl shadow-ambient-lg overflow-hidden border border-md-outline_variant/20">
              <Link href="/health" className="block px-4 py-2.5 text-xs text-md-on_surface_variant hover:bg-md-surface_container_low transition-colors">
                System Health
              </Link>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="block w-full text-left px-4 py-2.5 text-xs text-md-error hover:bg-md-error_container/30 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
