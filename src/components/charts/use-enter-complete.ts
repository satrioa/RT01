"use client";

import type { MotionValue } from "motion/react";
import { useSyncExternalStore } from "react";

/**
 * Returns true once a mount-progress MotionValue reaches 1.
 * Use to swap animated MotionValue-driven props for static values after
 * enter completes — drops per-frame subscriptions during pan/hover.
 */
export function useEnterComplete(mountProgress: MotionValue<number>): boolean {
  return useSyncExternalStore(
    (onStoreChange) => mountProgress.on("change", onStoreChange),
    () => mountProgress.get() >= 1,
    () => false
  );
}
