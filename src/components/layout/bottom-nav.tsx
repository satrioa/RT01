"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, BarChart3, Settings, Plus } from "lucide-react";
import { motion, type Transition } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

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

const dockSpring: Transition = {
  stiffness: 300,
  damping: 22,
  mass: 0.7,
};

export function BottomNav() {
  const pathname = usePathname();
  const [animateId, setAnimateId] = useState<string | null>(null);

  const handleClick = (id: string) => {
    setAnimateId(id);
    setTimeout(() => setAnimateId(null), 200);
  };

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

      <motion.div
        layout
        transition={dockSpring}
        className="relative z-10 flex items-end gap-3.5 rounded-3xl border-[1.5px] border-[#E5E5E9] bg-white px-3 py-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      >
        {NAV.slice(0, 2).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <motion.div
              key={item.href}
              className="relative"
              onClick={() => handleClick(item.href)}
              style={{ transformOrigin: "bottom" }}
              whileHover={{ y: -4 }}
              animate={{
                scale: animateId === item.href ? 1.3 : 1,
                y: animateId === item.href ? -6 : 0,
              }}
              transition={{ type: "spring", stiffness: 550, damping: 15, mass: 1.1 }}
            >
              <Link
                href={item.href}
                className={cn(
                  "flex size-10 items-center justify-center rounded-md transition-colors",
                  active ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-[#F4F4FB] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-600"
                )}
              >
                <item.icon className={cn("size-5", active && "text-white dark:text-zinc-900")} strokeWidth={active ? 2.2 : 1.8} />
              </Link>
              <motion.div
                className={cn(
                  "absolute mt-1 flex w-full items-center justify-center opacity-0 transition-opacity duration-300",
                  active && "opacity-100"
                )}
              >
                <div className="size-1 rounded-full bg-zinc-900 dark:bg-zinc-100" />
              </motion.div>
            </motion.div>
          );
        })}

        <motion.div
          className="relative"
          onClick={() => handleClick("fab")}
          style={{ transformOrigin: "bottom" }}
          whileHover={{ y: -4 }}
          animate={{
            scale: animateId === "fab" ? 1.3 : 1,
            y: animateId === "fab" ? -6 : 0,
          }}
          transition={{ type: "spring", stiffness: 550, damping: 15, mass: 1.1 }}
        >
          <Link
            href="/transactions/new"
            aria-label="Tambah transaksi"
            className="flex size-10 items-center justify-center rounded-md bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900"
          >
            <Plus className="size-5" />
          </Link>
        </motion.div>

        {NAV.slice(2).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <motion.div
              key={item.href}
              className="relative"
              onClick={() => handleClick(item.href)}
              style={{ transformOrigin: "bottom" }}
              whileHover={{ y: -4 }}
              animate={{
                scale: animateId === item.href ? 1.3 : 1,
                y: animateId === item.href ? -6 : 0,
              }}
              transition={{ type: "spring", stiffness: 550, damping: 15, mass: 1.1 }}
            >
              <Link
                href={item.href}
                className={cn(
                  "flex size-10 items-center justify-center rounded-md transition-colors",
                  active ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-[#F4F4FB] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-600"
                )}
              >
                <item.icon className={cn("size-5", active && "text-white dark:text-zinc-900")} strokeWidth={active ? 2.2 : 1.8} />
              </Link>
              <motion.div
                className={cn(
                  "absolute mt-1 flex w-full items-center justify-center opacity-0 transition-opacity duration-300",
                  active && "opacity-100"
                )}
              >
                <div className="size-1 rounded-full bg-zinc-900 dark:bg-zinc-100" />
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
      </nav>
    </>
  );
}

export function BottomNavSpacer() {
  return <div aria-hidden className="h-[88px] shrink-0" />;
}
