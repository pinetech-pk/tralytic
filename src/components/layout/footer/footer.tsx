"use client";

import Link from "next/link";
import { useSidebar } from "@/components/layout/sidebar";

export function Footer() {
  const { isMobile } = useSidebar();

  // Hide footer on mobile to maximize content space
  if (isMobile) {
    return null;
  }

  return (
    <footer className="border-t bg-card px-6 py-4">
      <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground lg:flex-row">
        {/* Copyright */}
        <p>&copy; {new Date().getFullYear()} Tralytic. All rights reserved.</p>

        {/* Links */}
        <nav className="flex items-center gap-4">
          <Link
            href="/help"
            className="transition-colors hover:text-foreground"
          >
            Help
          </Link>
          <Link
            href="/docs"
            className="hidden transition-colors hover:text-foreground lg:block"
          >
            Documentation
          </Link>
          <Link
            href="/terms"
            className="transition-colors hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
