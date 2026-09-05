"use client";

import AnimatedGradient from "@/components/animated-gradient";

type GrainientProps = {
  color1?: string;
  color2?: string;
  color3?: string;
  timeSpeed?: number;
  colorBalance?: number;
  warpStrength?: number;
  warpFrequency?: number;
  warpSpeed?: number;
  warpAmplitude?: number;
  blendAngle?: number;
  blendSoftness?: number;
  rotationAmount?: number;
  noiseScale?: number;
  grainAmount?: number;
  grainScale?: number;
  grainAnimated?: boolean;
  contrast?: number;
  gamma?: number;
  saturation?: number;
  centerX?: number;
  centerY?: number;
  zoom?: number;
  lightMode?: boolean;
  preset?: "Prism" | "Lava" | "Plasma" | "Pulse" | "Vortex" | "Mist";
  className?: string;
};

/** Compatibility adapter: existing cards keep their API while the renderer uses AnimatedGradient. */
const Grainient = ({ className = "", ...options }: GrainientProps) => {
  return (
    <AnimatedGradient
      config={
        options.preset
          ? { preset: options.preset, speed: options.timeSpeed ? options.timeSpeed * 100 : 0 }
          : {
              preset: "custom",
              color1: options.color1 ?? "#FF9FFC",
              color2: options.color2 ?? "#5227FF",
              color3: options.color3 ?? "#B497CF",
              speed: options.timeSpeed ? options.timeSpeed * 100 : 0,
          }
      }
      noise={{ opacity: options.grainAmount ?? 0.04 }}
      className={`grainient-container pointer-events-none ${className}`}
    />
  );
};

export default Grainient;
