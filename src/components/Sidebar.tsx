"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "H" },
  { href: "/startups", label: "Startups", icon: "S" },
  { href: "/projects", label: "Projects", icon: "P" },
  { href: "/investors", label: "Investors", icon: "I" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-brand-900 min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-brand-800/40">
        <h1 className="text-lg font-bold text-brand-100 tracking-tight">Pivo Partners</h1>
        <p className="text-xs text-brand-400 mt-0.5">Fundraising CRM</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-500/20 text-brand-100"
                  : "text-brand-300 hover:bg-brand-800/50 hover:text-brand-100"
              }`}>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                isActive ? "bg-brand-500 text-white" : "bg-brand-800/60 text-brand-400"
              }`}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-brand-800/40">
        <Link href="/health" className="text-xs text-brand-500 hover:text-brand-300 transition-colors">System Health</Link>
      </div>
    </aside>
  );
}
