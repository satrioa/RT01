"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/types/database";

export interface RoleContextValue {
  role: UserRole;
  isViewer: boolean;
  rtId: string | null;
}

export const RoleContext = createContext<RoleContextValue>({
  role: "viewer",
  isViewer: true,
  rtId: null,
});

export function useRole() {
  return useContext(RoleContext);
}

export function RoleProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: RoleContextValue;
}) {
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
