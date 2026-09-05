import { ImageResponse } from "next/og";

/**
 * PWA / apple-touch-icon generator — monogram "RT".
 * Charcoal #171717 di atas warm light #FAF9F6 (konsisten globals.css).
 * Monogram di tengah ~40% agar aman untuk maskable safe-zone.
 */
export function pwaIcon(size: number): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
        }}
      >
        <div
          style={{
            fontSize: size * 0.4,
            fontWeight: 800,
            color: "#FAF9F6",
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          RT
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
