import type { UserRole } from "./database";

export * from "./database";

/** Profil user yang sedang login — dipakai halaman /akun. */
export interface AuthProfile {
  id: string;
  email: string | null;
  name: string;
  role: UserRole;
  rtId: string | null;
}
