import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppEmptyProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** AppEmpty — estado vazio (sem resultados, lista sem itens). */
export function AppEmpty({ title, description, icon, action, className }: AppEmptyProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-md bg-card px-6 py-12 text-center", className)}>
      <span className="text-subtle-foreground" aria-hidden="true">
        {icon ?? <PackageOpen className="size-10" />}
      </span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
