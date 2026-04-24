"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard, LogOut, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "en";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [user, setUser] = useState<any>(null);

  const navLinks = [
    { href: `/${locale}`, label: "Home" },
    { href: `/${locale}/search`, label: "Ask a Question" },
    { href: `/${locale}/documents`, label: "Documents" },
    { href: `/${locale}/about`, label: "About" },
  ];

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (_event === 'SIGNED_IN') {
        // Force a refresh when signing in to ensure all components see the session
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleAdminRedirect = () => {
    setIsNavigating(true);
    // Using window.location.href for the admin dashboard ensures a clean session state
    window.location.href = `/${locale}/admin`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-nneYszLByQKmjNyUiQ21g57NX3XfeK.png"
            alt="Daegu International School"
            width={180}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden gap-2 md:flex"
                onClick={handleAdminRedirect}
                disabled={isNavigating}
              >
                <LayoutDashboard className="h-4 w-4" />
                {isNavigating ? "Loading..." : "Admin Dashboard"}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="hidden gap-2 md:flex"
                onClick={async () => {
                  const supabase = (await import("@/lib/supabase/client")).createClient();
                  await supabase.auth.signOut();
                  window.location.href = `/${locale}`;
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <Link href={`/${locale}/auth/login`} className="hidden md:block">
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                Admin Sign In
              </Button>
            </Link>
          )}


          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-border md:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-base font-medium transition-colors",
                  pathname === link.href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={user ? `/${locale}/admin` : `/${locale}/auth/login`}
              className="block"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button variant="outline" size="sm" className="mt-2 w-full gap-2">
                {user ? (
                  <>
                    <LayoutDashboard className="h-4 w-4" />
                    Admin Dashboard
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Admin Sign In
                  </>
                )}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
