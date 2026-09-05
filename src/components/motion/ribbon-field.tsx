"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";

/**
 * Ribbon Field — 21st.dev "sm" recreation (canvas stripe field)
 * Spec: angle 30, pos 0/25/50/75/100, softness 27, wave 6, count 6
 * Motion: ph = t*0.27, amt=0.20, dir=1, spin=ph*dir
 *  - angleAnimated = 30 + sin(spin*0.6)*28*amt  (no rounding)
 *  - waveClock = 20.75 + ph*1.2  (for curved stripe field)
 * Grain via SVG turbulence overlay.
 */

const PALETTE: [string, number][] = [
  ["#FF7E5F", 0],
  ["#FEB47B", 25],
  ["#FFCAA7", 50],
  ["#FFAD8F", 75],
  ["#CE6A57", 100],
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function RibbonField({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const rafRef = React.useRef<number>(0);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const ph = t * 0.27;
      const amt = 0.2;
      const spin = ph; // dir 1

      // exact 0 at ph=0: use cos(x)-1 already 0, sin(spin*0.6)*28*amt is 0 at 0
      const angleAnim = reduced ? 30 : 30 + Math.sin(spin * 0.6) * 28 * amt;
      const waveClock = reduced ? 20.75 : 20.75 + ph * 1.2;

      // clear
      ctx.clearRect(0, 0, width, height);
      // backdrop
      ctx.fillStyle = "#FF7E5F";
      ctx.fillRect(0, 0, width, height);

      const angleRad = (angleAnim * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);

      // stripe field params
      const scale = 68; // from JSON
      const stripePeriod = (width + height) / 6; // count 6
      const softness = 27; // feather in px

      // vignette radial
      // we will draw vignette last as overlay

      // For each pixel column along stripe direction, we could draw via loop per x
      // Instead draw diagonal stripes as polygons with wave offset
      // Simplified: draw 6 stripes as filled polygons with sine wave offset on cross axis
      const count = 6;
      // colors interpolated per stripe segment
      // Build stops for interpolation
      const stops = PALETTE.map(([hex, pos]) => ({ rgb: hexToRgb(hex), pos }));

      const getColorAt = (p: number): string => {
        // p 0-100
        for (let i = 0; i < stops.length - 1; i++) {
          const a = stops[i];
          const b = stops[i + 1];
          if (p >= a.pos && p <= b.pos) {
            const t2 = (p - a.pos) / (b.pos - a.pos);
            const r = Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t2);
            const g = Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t2);
            const b2 = Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t2);
            return `rgb(${r},${g},${b2})`;
          }
        }
        const last = stops[stops.length - 1];
        return `rgb(${last.rgb[0]},${last.rgb[1]},${last.rgb[2]})`;
      };

      // Draw stripes
      // We iterate along perpendicular distance
      const diagLen = Math.hypot(width, height) * 1.5;
      const centerX = width * 0.5;
      const centerY = height * 0.5;

      for (let i = 0; i < count; i++) {
        const posNorm = (i / (count - 1)) * 100;
        const color = getColorAt(posNorm);
        // stripe center line offset along perpendicular
        const offset = (i - (count - 1) / 2) * (stripePeriod * 0.68);
        // stripe width proportional to scale
        const stripeHalf = (stripePeriod * 0.42 * scale) / 68;

        ctx.fillStyle = color;
        ctx.beginPath();
        const steps = 40;
        const topPoints: [number, number][] = [];
        const bottomPoints: [number, number][] = [];
        for (let s = 0; s <= steps; s++) {
          const along = (s / steps - 0.5) * diagLen;
          // cross-axis sine wave
          const wave = reduced ? 0 : (6 / 100) * 0.35 * Math.sin((along / diagLen) * 2.4 * Math.PI * 2 + waveClock) * diagLen * 0.12;
          // point along stripe direction + perpendicular offset + wave
          const perp = offset + wave;
          // rotate
          const x = centerX + along * cosA - perp * sinA;
          const y = centerY + along * sinA + perp * cosA;
          // offset for stripe half width perpendicular
          const nx = -sinA;
          const ny = cosA;
          topPoints.push([x + nx * stripeHalf, y + ny * stripeHalf]);
          bottomPoints.push([x + nx * -stripeHalf, y + ny * -stripeHalf]);
        }
        // build polygon with feather via softness: we just draw solid, feather via shadow/gradient is approximated by soft edge via globalAlpha gradient not needed for MVP
        // Draw as polygon
        ctx.moveTo(topPoints[0][0], topPoints[0][1]);
        for (let k = 1; k < topPoints.length; k++) ctx.lineTo(topPoints[k][0], topPoints[k][1]);
        for (let k = bottomPoints.length - 1; k >= 0; k--) ctx.lineTo(bottomPoints[k][0], bottomPoints[k][1]);
        ctx.closePath();
        ctx.fill();

        // feather edges with softness: overlay a linear gradient alpha at stripe edges (simplified as outer stroke with blur)
        if (softness > 0) {
          ctx.save();
          ctx.globalAlpha = 0.18;
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = softness * 0.3;
          ctx.stroke();
          ctx.restore();
        }
      }

      // vignette radial
      const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.7);
      grd.addColorStop(0.52, "rgba(0,0,0,0)");
      grd.addColorStop(1, "rgba(0,0,0,0.09)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);

      // grain overlay via subtle noise (approx)
      ctx.save();
      ctx.globalAlpha = 0.085;
      // SVG turbulence approximated with random dots
      for (let n = 0; n < 900; n++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const v = Math.random() > 0.5 ? 0 : 255;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.restore();

      if (!reduced) rafRef.current = requestAnimationFrame(draw);
    };

    if (reduced) {
      draw(performance.now());
    } else {
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}

export function RibbonFieldCSS({ className }: { className?: string }) {
  // Fallback CSS exact when canvas not needed / reduced motion
  return (
    <div
      className={className}
      style={{
        backgroundColor: "#FF7E5F",
        backgroundImage:
          'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/></filter><rect width=\'100%\' height=\'100%\' filter=\'url(%23n)\' opacity=\'0.085\'/></svg>"), radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0) 52%, rgba(0, 0, 0, 0.024) 100%), linear-gradient(30deg, #FF7E5F 0%, #FF7E5F 12.5%, #FEB47B 15.88%, #FEB47B 34.13%, #FFCAA7 40.88%, #FFCAA7 59.13%, #FFAD8F 65.88%, #FFAD8F 84.13%, #CE6A57 87.5%, #CE6A57 100%)',
        backgroundSize: "120px 120px, auto, auto",
        backgroundBlendMode: "overlay, normal, normal",
      }}
      aria-hidden
    />
  );
}
