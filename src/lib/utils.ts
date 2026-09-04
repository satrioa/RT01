import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatCompactRupiah(value: number): string {
  if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)} jt`;
  if (value >= 1_000) return `Rp${(value / 1_000).toFixed(0)} rb`;
  return formatRupiah(value);
}
