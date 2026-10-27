import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

/**
 * Container — coluna de conteúdo do Figma: 1200 px úteis em 1440 (1264 incluindo o respiro de 32 px
 * de cada lado) e margem de 16 px no mobile. Use em TODA página para alinhar com Header/Footer.
 */
export function Container({ as: Component = "div", className, ...props }: ContainerProps) {
  return <Component className={cn("mx-auto w-full max-w-316 px-4 md:px-8", className)} {...props} />;
}
