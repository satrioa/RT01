"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Receipt, BarChart3, Settings, Plus } from "lucide-react";
import { GlassToggleGroup, GlassToggleGroupItem } from "@/components/glass-toggle-group";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { cn } from "@/lib/utils";

type NavItem = {
  value: string;
  label: string;
  icon: typeof Home;
  fab?: boolean;
};

const NAV: NavItem[] = [
  { value: "/", label: "Home", icon: Home },
  { value: "/transactions", label: "Transaksi", icon: Receipt },
  { value: "/transactions/new", label: "Tambah", icon: Plus, fab: true },
  { value: "/reports", label: "Laporan", icon: BarChart3 },
  { value: "/pengaturan", label: "Pengaturan", icon: Settings },
];

function activeValue(pathname: string): string {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/transactions/new") || pathname.startsWith("/transaksi/new")) return "/transactions/new";
  if (pathname.startsWith("/transactions") || pathname.startsWith("/transaksi")) return "/transactions";
  if (pathname.startsWith("/reports") || pathname.startsWith("/laporan")) return "/reports";
  if (pathname.startsWith("/pengaturan")) return "/pengaturan";
  return "";
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeValue(pathname);

  return (
    <>
      {/* Progressive blur dibawah dock — fixed di viewport bottom */}
      <ProgressiveBlur
        position="bottom"
        height="140px"
        className="fixed inset-x-0 bottom-0 z-20 pointer-events-none"
        blurLevels={[0, 1, 2, 6, 12, 24, 40]}
      />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex w-full justify-center bg-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      >
        <GlassToggleGroup
          value={active}
          onValueChange={(v) => router.push(v)}
          aria-label="Primary"
          className="rounded-full px-1.5 py-1.5"
        >
          {NAV.map((item) => (
            <GlassToggleGroupItem
              key={item.value}
              value={item.value}
              aria-label={item.label}
              className={cn(
                "px-3.5 py-2.5",
                item.fab &&
                  "mx-0.5 bg-zinc-900 text-white hover:text-white data-checked:text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:text-zinc-900 dark:data-checked:text-zinc-900"
              )}
            >
              <item.icon className="size-5" strokeWidth={active === item.value ? 2.2 : 1.8} />
            </GlassToggleGroupItem>
          ))}
        </GlassToggleGroup>
      </nav>
    </>
  );
}

export function BottomNavSpacer() {
  return <div aria-hidden className="h-[88px] shrink-0" />;
}
