import { Link, useRouter } from "@tanstack/react-router";
import { DropdownMenu } from "radix-ui";
import { Heart, LogOut, User, Wallet } from "lucide-react";
import { AppAvatar, toast } from "@/components/ui";
import { useAuth } from "@/modules/auth";
import { isPrivatePath } from "./chrome";

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-background data-[highlighted]:text-accent-foreground";

/**
 * AccountMenu — menu do colecionador logado (avatar → Meu perfil, Carteiras, Lista de interesse, Sair).
 * Ao sair de uma rota privada, voltamos ao início (o store de sessão já limpa cache/socket/storages).
 */
export function AccountMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const name = user?.displayName ?? user?.username ?? "Colecionador";

  async function handleLogout() {
    await logout();
    toast.success("Você saiu da sua conta.");
    if (isPrivatePath(router.state.location.pathname)) router.history.push("/");
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Menu da conta de ${name}`}
        className="rounded-full outline-offset-2 transition-opacity hover:opacity-90"
      >
        <AppAvatar src={user?.avatarUrl} name={name} size="md" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-60 min-w-56 rounded-md border border-border bg-card p-1 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <DropdownMenu.Label className="px-3 py-2">
            <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
            {user?.email && <span className="block truncate text-xs text-muted-foreground">{user.email}</span>}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/perfil">
              <User className="size-4" aria-hidden="true" />
              Meu perfil
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/perfil/carteiras">
              <Wallet className="size-4" aria-hidden="true" />
              Carteiras
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/perfil/favoritos">
              <Heart className="size-4" aria-hidden="true" />
              Lista de interesse
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={itemClass} onSelect={() => void handleLogout()}>
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
