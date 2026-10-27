import { createFileRoute, notFound } from "@tanstack/react-router";
import { DesignSystemShowcase } from "@/components/shared/DesignSystemShowcase";
import { env } from "@/env";

// Vitrine do Design System: só existe nos builds com mocks (dev e demo). Em produção real → 404.
export const Route = createFileRoute("/design-system")({
  beforeLoad: () => {
    if (!env.VITE_ENABLE_MOCKS) throw notFound();
  },
  head: () => ({ meta: [{ title: "Design System · Kurio" }] }),
  component: DesignSystemShowcase,
});
