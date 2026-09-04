"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AmountInput({
  name = "amount",
  defaultValue,
  required,
  className,
  placeholder = "Rp 0",
}: {
  name?: string;
  defaultValue?: string | number;
  required?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [display, setDisplay] = React.useState(() => {
    if (defaultValue == null || defaultValue === "") return "";
    const n = Number(String(defaultValue).replace(/[^\d]/g, ""));
    if (!n) return "";
    return formatDisplay(n);
  });

  const rawValue = display.replace(/[^\d]/g, "");

  function formatDisplay(n: number): string {
    return "Rp " + new Intl.NumberFormat("id-ID").format(n);
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        inputMode="numeric"
        placeholder={placeholder}
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          if (!digits) {
            setDisplay("");
            return;
          }
          const n = Number(digits);
          if (Number.isNaN(n)) return;
          if (n > 999_999_999_999) return;
          setDisplay(formatDisplay(n));
        }}
        className="pr-12 text-base font-semibold tabular-nums"
        aria-label="Jumlah"
        required={required}
        autoComplete="off"
      />
      {/* hidden field sent to server: plain digits without formatting */}
      <input type="hidden" name={name} value={rawValue} required={required} />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">IDR</span>
    </div>
  );
}
