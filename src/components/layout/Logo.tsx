import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Kurio, página inicial"
      className={cn("rounded-xs text-xs font-bold tracking-[0.25em] text-foreground", className)}
    >
      KURIO
    </Link>
  );
}
