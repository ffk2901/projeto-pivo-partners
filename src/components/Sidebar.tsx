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
    <aside className="w-56 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">Pivo Partners</h1>
        <p className="text-xs text-gray-400 mt-0.5">Fundraising CRM</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}>
              <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
              }`}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-gray-100">
        <Link href="/health" className="text-xs text-gray-400 hover:text-gray-600">System Health</Link>
      </div>
    </aside>
  );
}
