import type { AnchorHTMLAttributes } from "react";
import { useLinkProps, type LinkProps } from "@tanstack/react-router";

interface NavLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: LinkProps["to"];
  hash?: string;
  active: boolean;
}

/**
 * NavLink — link do Router em que o `aria-current` é controlado por quem usa.
 * O <Link> do Router marca `aria-current="page"` sempre que a ROTA casa e sobrescreve a prop;
 * como "Início" e "Mercado" apontam para a mesma rota ("/", só muda o hash), os dois ficariam ativos.
 * Aqui espalhamos as props do `useLinkProps` e aplicamos o estado ativo por último.
 */
export function NavLink({ to, hash, active, children, ...rest }: NavLinkProps) {
  const linkProps = useLinkProps({ to, hash });
  return (
    <a
      {...linkProps}
      {...rest}
      data-status={active ? "active" : undefined}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </a>
  );
}
