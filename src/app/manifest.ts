import type { MetadataRoute } from "next";

/**
 * PWA manifest — "Add to Home Screen" di iPhone (standalone, tanpa address bar).
 * Ikon digenerate via src/app/icon.tsx (512) & apple-icon.tsx (180).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RTFinance — Pembukuan RT",
    short_name: "RTFinance",
    description:
      "Aplikasi pembukuan keuangan RT yang simpel dan modern. Kelola kantong, transaksi, dan laporan.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF9F6",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
