import type { ReactNode } from "react";
import { Tooltip } from "radix-ui";

export interface AppTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
}

/** AppTooltip — dica ao focar/passar o mouse. Não use para informação essencial (some no toque). */
export function AppTooltip({ content, children, side = "top", delayDuration = 150 }: AppTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={delayDuration}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={6}
            className="z-60 rounded-sm border border-border bg-card px-2.5 py-1.5 text-xs text-foreground data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0"
          >
            {content}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
