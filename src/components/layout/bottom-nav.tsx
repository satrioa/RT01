"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, BarChart3, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Transaksi", icon: Receipt },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/transactions") return pathname.startsWith("/transactions") || pathname.startsWith("/transaksi");
  if (href === "/reports") return pathname.startsWith("/reports") || pathname.startsWith("/laporan");
  return pathname === href || pathname.startsWith(href + "/");
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-[430px] items-center justify-around border-t bg-card px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {NAV.slice(0, 2).map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
            {item.label}
          </Link>
        );
      })}

      {/* FAB — centered + action */}
      <Link
        href="/transactions/new"
        aria-label="Tambah transaksi"
        className="flex size-12 -translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="size-6" />
      </Link>

      {NAV.slice(2).map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNavSpacer() {
  return <div aria-hidden className="h-[72px] shrink-0" />;
}
