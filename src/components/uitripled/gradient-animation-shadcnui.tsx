"use client";

import { motion } from "framer-motion";

type GradientAnimationProps = {
  color1?: string;
  color2?: string;
  color3?: string;
  timeSpeed?: number;
  grainAmount?: number;
  className?: string;
};

export function GradientAnimation({
  color1 = "#667eea",
  color2 = "#764ba2",
  color3 = "#f093fb",
  timeSpeed = 0.25,
  grainAmount = 0,
  className = "",
}: GradientAnimationProps) {
  const animated = timeSpeed > 0;
  const duration = Math.max(3, 10 / timeSpeed);
  const colors = [
    `linear-gradient(135deg, ${color1} 0%, ${color2} 52%, ${color3} 100%)`,
    `linear-gradient(225deg, ${color2} 0%, ${color3} 52%, ${color1} 100%)`,
    `linear-gradient(315deg, ${color3} 0%, ${color1} 52%, ${color2} 100%)`,
    `linear-gradient(135deg, ${color1} 0%, ${color2} 52%, ${color3} 100%)`,
  ];

  return (
    <div className={`relative size-full overflow-hidden ${className}`}>
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ filter: grainAmount > 0 ? `saturate(${1 + grainAmount})` : undefined }}
        animate={animated ? { background: colors } : { background: colors[0] }}
        transition={{
          duration,
          repeat: animated ? Infinity : 0,
          ease: "linear",
        }}
      />
    </div>
  );
}
