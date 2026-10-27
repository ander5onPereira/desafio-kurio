import { useRef } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { AppModal } from "@/components/ui";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";
import { closeTarget, safeRedirect } from "../redirect";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { SocialButtons } from "./SocialButtons";

export interface AuthDialogProps {
  mode: "login" | "register";
  /** Parâmetro `?redirect=` já lido da URL (será validado aqui). */
  redirect?: string;
}

const COPY = {
  login: {
    title: "Entrar",
    intro: "Entre para gerenciar sua carteira, coleção e perfil de criador.",
    switchPrompt: "Novo na Kurio?",
    switchLabel: "Crie uma conta",
  },
  register: {
    title: "Criar conta",
    intro: "Crie seu perfil de colecionador e conecte uma carteira quando quiser.",
    switchPrompt: "Já tem uma conta?",
    switchLabel: "Entre",
  },
} as const;

/**
 * AuthDialog — login e cadastro no MESMO componente. As "abas" são rotas reais (/login e /cadastro):
 * acesso direto e refresh funcionam. Desktop: diálogo centralizado (a página Início aparece ao fundo);
 * mobile: tela cheia com logo. Fechar (Esc/X) volta ao fluxo anterior sem exigir login.
 */
export function AuthDialog({ mode, redirect }: AuthDialogProps) {
  const router = useRouter();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const copy = COPY[mode];

  // Pós-login: substitui /login no histórico para o "voltar" não reabrir o formulário.
  const goBackToFlow = () => router.history.replace(safeRedirect(redirect));
  const close = () => router.history.replace(closeTarget(redirect));
  const search = redirect ? { redirect } : {};

  const tabClass = (active: boolean) =>
    cn(
      "px-1 text-lg font-semibold transition-colors hover:text-accent-foreground",
      active ? "text-accent-foreground" : "text-foreground",
    );

  return (
    <AppModal
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={copy.title}
      hideTitle
      description={copy.intro}
      size="sm"
      fullScreenOnMobile
      initialFocusRef={firstFieldRef}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6 pb-4 md:pb-2">
        <div className="mt-8 flex justify-center md:hidden">
          <Logo className="text-3xl" />
        </div>
        <p aria-hidden="true" className="text-center text-xl font-bold text-foreground md:hidden">
          {copy.title}
        </p>

        <nav aria-label="Entrar ou criar conta" className="hidden items-center justify-center gap-3 md:flex">
          <Link to="/login" search={search} aria-current={mode === "login" ? "page" : undefined} className={tabClass(mode === "login")}>
            Entrar
          </Link>
          <span aria-hidden="true" className="h-5 w-px bg-primary" />
          <Link
            to="/cadastro"
            search={search}
            aria-current={mode === "register" ? "page" : undefined}
            className={tabClass(mode === "register")}
          >
            Criar conta
          </Link>
        </nav>

        <p className="text-center text-xs text-foreground">{copy.intro}</p>

        {mode === "login" ? (
          <LoginForm onSuccess={goBackToFlow} firstFieldRef={firstFieldRef} />
        ) : (
          <RegisterForm onSuccess={goBackToFlow} firstFieldRef={firstFieldRef} />
        )}

        <SocialButtons />

        <p className="text-center text-sm text-muted-foreground md:hidden">
          {copy.switchPrompt}{" "}
          <Link
            to={mode === "login" ? "/cadastro" : "/login"}
            search={search}
            className="text-accent-foreground underline underline-offset-4"
          >
            {copy.switchLabel}
          </Link>
        </p>
      </div>
    </AppModal>
  );
}
