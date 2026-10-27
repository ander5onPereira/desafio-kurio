import { Avatar } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const avatarVariants = cva("relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-card text-accent-foreground", {
  variants: {
    size: { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-[3.25rem] text-base", xl: "size-20 text-xl" },
  },
  defaultVariants: { size: "md" },
});

export interface AppAvatarProps extends VariantProps<typeof avatarVariants> {
  /** URL ou data URL da imagem. */
  src?: string | null;
  /** Nome da pessoa: vira texto alternativo e a inicial de reserva. Sem nome → ícone de imagem. */
  name?: string | null;
  className?: string;
}

/** AppAvatar — foto do colecionador; sem imagem mostra a inicial do nome ou o ícone do Figma. */
export function AppAvatar({ src, name, size, className }: AppAvatarProps) {
  const initial = name?.trim().charAt(0).toUpperCase();
  return (
    <Avatar.Root className={cn(avatarVariants({ size }), className)}>
      {src && <Avatar.Image src={src} alt={name ? `Avatar de ${name}` : "Avatar"} className="size-full object-cover" />}
      <Avatar.Fallback delayMs={src ? 300 : 0} className="inline-flex size-full items-center justify-center font-semibold">
        {initial ? <span aria-hidden="true">{initial}</span> : <ImageIcon className="size-1/2" aria-hidden="true" />}
        {name && <span className="sr-only">{name}</span>}
      </Avatar.Fallback>
    </Avatar.Root>
  );
}
