import { getCurrentUserRole, getAuthRtId } from "@/lib/auth";
import { RoleProvider, type RoleContextValue } from "@/lib/role-context";

export async function RoleProviderBlock({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, rtId] = await Promise.all([getCurrentUserRole(), getAuthRtId()]);

  const value: RoleContextValue = {
    role: role ?? "viewer",
    isViewer: role !== "admin" && role !== "bendahara",
    rtId: rtId ?? null,
  };

  return <RoleProvider value={value}>{children}</RoleProvider>;
}
