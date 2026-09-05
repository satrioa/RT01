import Link from "next/link";
import { Bell, Settings2 } from "lucide-react";
import { greetingForHour } from "@/lib/format";

export function GreetingHeader({
  rtName,
  rtNumber,
  rwNumber,
}: {
  rtName: string;
  rtNumber: string;
  rwNumber: string;
}) {
  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);

  return (
    <header className="flex items-start justify-between gap-4 px-1 py-1">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{greeting} 👋</p>
        <h1 className="truncate text-[15px] font-semibold tracking-tight">
          {rtName} <span className="text-muted-foreground">/ RW {rwNumber}</span>
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/pengaturan"
          aria-label="Pengaturan"
          className="flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="size-4" />
        </Link>
        <button
          type="button"
          aria-label="Notifikasi"
          className="flex size-9 items-center justify-center rounded-full border bg-card text-muted-foreground"
        >
          <Bell className="size-4" />
        </button>
      </div>
    </header>
  );
}

export function GreetingHeaderSkeleton() {
  return (
    <div className="flex animate-pulse justify-between px-1 py-1">
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-5 w-32 rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        <div className="size-9 rounded-full bg-muted" />
        <div className="size-9 rounded-full bg-muted" />
      </div>
    </div>
  );
}
