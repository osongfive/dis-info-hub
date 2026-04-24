import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const ADMIN_EMAILS = ["osongfivestar@gmail.com"];

/**
 * Checks if a user has administrative privileges.
 * Supports both email allowlist and role-based metadata.
 */
export function checkIsAdmin(user: any): boolean {
  if (!user) return false;
  
  const userRole = 
    (user.app_metadata?.role as string) || 
    (user.user_metadata?.role as string);
    
  return ADMIN_EMAILS.includes(user.email ?? "") || userRole === "admin";
}

/**
 * Server-side utility to require admin access.
 * Returns the user if admin, otherwise throws an error or redirects.
 */
export async function requireAdmin(options: { shouldRedirect?: boolean; locale?: string } = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !checkIsAdmin(user)) {
    if (options.shouldRedirect) {
      const locale = options.locale || "en";
      redirect(`/${locale}/auth/login?redirect=admin`);
    }
    throw new Error("Unauthorized: Admin access required.");
  }

  return user;
}
