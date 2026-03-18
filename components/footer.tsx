import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-block">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-TOKsutbVosrZUWb3zKaGAcLVX6jufQ.png"
                alt="Daegu International School"
                width={80}
                height={80}
                className="h-20 w-20"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Get instant answers from official school documents, handbooks, and
              policies using AI-powered search.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Ask a Question
                </Link>
              </li>
              <li>
                <Link
                  href="/documents"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Documents
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Contact</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Daegu International School</li>
              <li>Lee Academy</li>
              <li className="pt-2">info@dis.sc.kr</li>
              <li className="pt-1 text-[11px] font-medium text-primary/80 uppercase tracking-tight">Support: 2029jalee@dis.sc.kr</li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div className="mt-12 border-t border-border pt-8">
          <div className="flex flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
            <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
              &copy; {new Date().getFullYear()} Daegu International School. This service uses AI. 
              <span className="block mt-1 opacity-75">Data may be processed on servers outside Korea (United States).</span>
            </p>
            
            <div className="flex gap-6">
              <Link
                href="/privacy#rights-request"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary underline underline-offset-4 decoration-border"
              >
                Privacy Rights
              </Link>
              <Link
                href="/privacy"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary underline underline-offset-4 decoration-border"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary underline underline-offset-4 decoration-border"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
