"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanBarcode,
  UtensilsCrossed,
  User,
  CalendarDays,
  ShoppingCart,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/scanner", label: "Scanner", icon: ScanBarcode },
  { href: "/calendrier", label: "Planning", icon: CalendarDays },
  { href: "/garde-manger", label: "Garde-manger", icon: UtensilsCrossed },
  { href: "/liste-courses", label: "Courses", icon: ShoppingCart },
  { href: "/profile", label: "Profil", icon: User },
];

export default function Navbar() {
  const pathname = usePathname();

  // Hide navbar on pages that shouldn't show it
  const hiddenPaths = ["/creation-recette", "/suggestions-recettes", "/login"];
  if (hiddenPaths.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-float z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full touch-target touch-active transition-all duration-200 ${
                isActive
                  ? "text-primary-500 dark:text-primary-400"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-primary-50 dark:bg-primary-900/30" : ""}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={`text-[9px] mt-0.5 ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
