import type { User } from "@supabase/supabase-js";

/** Only server-validated users with a Google identity can unlock YouTube. */
export function isGoogleAccount(user: User | null): user is User {
  return Boolean(user?.identities?.some((identity) => identity.provider === "google"));
}