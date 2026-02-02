"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanBarcode,
  UtensilsCrossed,
  User,
  CalendarDays,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scanner", label: "Scanner", icon: ScanBarcode },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/garde-manger", label: "Garde-manger", icon: UtensilsCrossed },
  { href: "/profile", label: "Profil", icon: User },
];

export default function Navbar() {
  const pathname = usePathname();

  // Hide navbar on pages that shouldn't show it
  const hiddenPaths = ["/creation-recette", "/suggestions-recettes"];
  if (hiddenPaths.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive
                  ? "text-primary-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
