import { useState, type ReactNode } from "react";
import { Heart, Search, Trash2 } from "lucide-react";
import {
  AppAvatar,
  AppBadge,
  AppBreadcrumb,
  AppButton,
  AppCard,
  AppCarousel,
  AppCheckbox,
  AppComingSoon,
  AppConfirm,
  AppDrawer,
  AppEmpty,
  AppError,
  AppFormField,
  AppInput,
  AppModal,
  AppPagination,
  AppPasswordInput,
  AppRadioCard,
  AppRadioChip,
  AppRadioGroup,
  AppSelect,
  AppSkeleton,
  AppSkeletonGroup,
  AppSlider,
  AppTabs,
  AppTabsContent,
  AppTabsList,
  AppTabsTrigger,
  AppTextarea,
  AppTooltip,
  toast,
} from "@/components/ui";
import { Container } from "@/components/layout/Container";
import { MobileSearchBar } from "@/components/layout/MobileSearchBar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { AppArtwork } from "./AppArtwork";
import { AppEthAmount } from "./AppEthAmount";
import { AppQuantityStepper } from "./AppQuantityStepper";
import { announce } from "./AppLiveRegion";

/** Seção da vitrine: título + conteúdo. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`ds-${title}`} className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 id={`ds-${title}`} className="text-lg font-bold text-accent-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

const SWATCHES = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["strip", "bg-strip"],
  ["border", "bg-border"],
  ["primary", "bg-primary"],
  ["primary-hover", "bg-primary-hover"],
  ["primary-pressed", "bg-primary-pressed"],
  ["foreground", "bg-foreground"],
  ["muted-foreground", "bg-muted-foreground"],
  ["subtle-foreground", "bg-subtle-foreground"],
  ["accent-foreground", "bg-accent-foreground"],
  ["danger", "bg-danger"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["info", "bg-info"],
] as const;

const SAMPLE = { key: "emerald", alt: "Macaco de óculos e jaqueta verde (Emerald Ape #042)" } as const;
const SELECT_OPTIONS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "solana", label: "Solana" },
];

/**
 * Vitrine do Design System (rota /design-system, só no build com mocks): todos os componentes
 * App* em todos os estados. Serve de documentação viva e de conferência visual.
 */
export function DesignSystemShowcase() {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [qty, setQty] = useState(2);
  const [page, setPage] = useState(3);
  const [range, setRange] = useState<[number, number]>([2, 1230]);
  const [wallet, setWallet] = useState("coinbase");
  const [edition, setEdition] = useState("1/50");
  const [checked, setChecked] = useState(false);
  const [network, setNetwork] = useState<string | undefined>("polygon");

  return (
    <Container className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Design System Kurio</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Todos os componentes <code>App*</code> e seus estados. Tokens em <code>src/styles/tokens.css</code>; fonte Roboto Mono; tema escuro.
        </p>
      </header>

      <Section title="Cores (tokens)">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SWATCHES.map(([name, className]) => (
            <li key={name} className="flex items-center gap-3 text-xs text-muted-foreground">
              <span aria-hidden="true" className={`size-10 shrink-0 rounded-sm border border-border ${className}`} />
              {name}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tipografia">
        <div className="flex flex-col gap-2">
          <p className="text-4xl font-bold">SEJA DONO DO FUTURO</p>
          <p className="text-2xl font-bold">Título secundário</p>
          <p className="text-lg font-semibold">Subtítulo / seção</p>
          <p className="text-sm">Texto base 14px — Descubra NFTs selecionados de criadores emergentes.</p>
          <p className="text-sm text-muted-foreground">Texto auxiliar — ID do token: #0042</p>
          <p className="text-xs text-subtle-foreground">Legenda — Taxa estimada</p>
        </div>
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <AppButton>Primário</AppButton>
          <AppButton variant="secondary">Secundário</AppButton>
          <AppButton variant="outline" leftIcon={<Heart className="size-4" />}>
            Favoritar
          </AppButton>
          <AppButton variant="ghost">Ghost</AppButton>
          <AppButton variant="link">Link</AppButton>
          <AppButton variant="danger" leftIcon={<Trash2 className="size-4" />}>
            Remover
          </AppButton>
          <AppButton isLoading>Carregando</AppButton>
          <AppButton disabled>Desabilitado</AppButton>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AppButton size="xs">XS</AppButton>
          <AppButton size="sm">SM</AppButton>
          <AppButton size="md">MD</AppButton>
          <AppButton size="lg">LG</AppButton>
          <AppButton iconOnly aria-label="Buscar" variant="secondary">
            <Search className="size-4" />
          </AppButton>
        </div>
      </Section>

      <Section title="Campos e formulário">
        <div className="grid gap-4 md:grid-cols-2">
          <AppFormField label="Nome de exibição" required helper="Como seu nome aparece para outros colecionadores.">
            {(field) => <AppInput {...field} placeholder="Ex.: Nova Sato" />}
          </AppFormField>
          <AppFormField label="E-mail" required error="Informe um e-mail válido">
            {(field) => <AppInput {...field} type="email" defaultValue="invalido" />}
          </AppFormField>
          <AppFormField label="Senha">{(field) => <AppPasswordInput {...field} defaultValue="segredo123" />}</AppFormField>
          <AppFormField label="Rede" required>
            {(field) => <AppSelect {...field} options={SELECT_OPTIONS} value={network} onValueChange={setNetwork} placeholder="Selecione uma rede" />}
          </AppFormField>
          <AppFormField label="Observação do colecionador (opcional)" className="md:col-span-2">
            {(field) => <AppTextarea {...field} />}
          </AppFormField>
          <AppCheckbox label="Usar outra carteira?" checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
        </div>
      </Section>

      <Section title="Valores em ETH, quantidade e arte">
        <div className="flex flex-wrap items-center gap-8">
          <AppEthAmount value="1.19" />
          <AppEthAmount value="1.99" compareAt="2.29" />
          <AppEthAmount value="26.846" tone="foreground" size="lg" />
          <AppEthAmount value="0" prefix="(-)" tone="foreground" unit={false} />
          <AppQuantityStepper value={qty} onChange={setQty} max={5} label="Emerald Ape #042" />
          <AppQuantityStepper value={1} onChange={() => undefined} size="sm" label="Violet Nomad #314" />
        </div>
        <div className="flex flex-wrap gap-4">
          <AppArtwork artwork={SAMPLE} className="w-40 rounded-md" />
          <AppArtwork artwork={{ key: "golden", alt: "Macaco laranja com fones" }} variant="thumb" className="size-16 rounded-sm" />
          <AppArtwork artwork={{ key: "sage", alt: "Gorila de chapéu e moletom roxo" }} variant="thumb" className="size-16 rounded-sm" />
          <AppArtwork artwork={{ key: "ivory", alt: "Gorila de blazer" }} variant="thumb" className="size-16 rounded-sm" />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-3">
          <AppBadge variant="rare">Raro</AppBadge>
          <AppBadge variant="soon">Em breve</AppBadge>
          <AppBadge variant="count">6</AppBadge>
          <AppBadge variant="neutral">Neutro</AppBadge>
          <AppBadge variant="success">Confirmado</AppBadge>
          <AppBadge variant="danger">Recusado</AppBadge>
          <AppBadge variant="warning">Pendente</AppBadge>
          <AppBadge variant="info">Info</AppBadge>
        </div>
      </Section>

      <Section title="Carregando, vazio e erro">
        <div className="grid gap-4 md:grid-cols-3">
          <AppSkeletonGroup label="Carregando exemplo">
            <AppCard className="flex flex-col gap-3">
              <AppSkeleton className="aspect-square w-full" />
              <AppSkeleton className="h-4 w-2/3" />
              <AppSkeleton className="h-4 w-1/3" />
            </AppCard>
          </AppSkeletonGroup>
          <AppEmpty title="Nenhum NFT encontrado" description="Ajuste os filtros ou limpe a busca." action={<AppButton size="sm">Limpar filtros</AppButton>} />
          <AppError title="Não foi possível carregar" message="Tente novamente em instantes." onRetry={() => toast.info("Tentando de novo…")} />
        </div>
      </Section>

      <Section title="Seleção">
        <div className="grid gap-6 md:grid-cols-2">
          <AppRadioGroup aria-label="Carteira" value={wallet} onValueChange={setWallet}>
            <AppRadioCard value="walletconnect" title="WalletConnect" icon="W" />
            <AppRadioCard value="metamask" title="MetaMask" icon="M" />
            <AppRadioCard value="coinbase" title="Coinbase Wallet" description="Rede Polygon" icon="C" />
          </AppRadioGroup>
          <div className="flex flex-col gap-4">
            <AppRadioGroup aria-label="Edição" value={edition} onValueChange={setEdition} className="flex flex-wrap gap-2">
              <AppRadioChip value="1/1">1/1</AppRadioChip>
              <AppRadioChip value="1/10">1/10</AppRadioChip>
              <AppRadioChip value="1/50">1/50</AppRadioChip>
              <AppRadioChip value="aberta" disabled>
                ABERTA · Esgotada
              </AppRadioChip>
            </AppRadioGroup>
            <div className="max-w-sm">
              <AppSlider value={range} onValueChange={setRange} min={2} max={1230} minLabel="Preço mínimo" maxLabel="Preço máximo" />
              <p className="mt-2 text-xs text-muted-foreground">
                Preço: {(range[0] / 100).toFixed(2)} - {(range[1] / 100).toFixed(2)} ETH
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Navegação">
        <AppBreadcrumb items={[{ label: "Início", to: "/" }, { label: "Mercado", to: "/", hash: "catalogo" }, { label: "Carrinho" }]} />
        <AppTabs defaultValue="detalhes">
          <AppTabsList aria-label="Seções do NFT">
            <AppTabsTrigger value="detalhes">Detalhes do NFT</AppTabsTrigger>
            <AppTabsTrigger value="avaliacoes">Avaliações de colecionadores (19)</AppTabsTrigger>
          </AppTabsList>
          <AppTabsContent value="detalhes" className="text-sm text-muted-foreground">
            Conteúdo da aba de detalhes.
          </AppTabsContent>
          <AppTabsContent value="avaliacoes" className="text-sm text-muted-foreground">
            Conteúdo da aba de avaliações.
          </AppTabsContent>
        </AppTabs>
        <AppPagination page={page} totalPages={12} onPageChange={setPage} />
      </Section>

      <Section title="Barras mobile (visíveis só abaixo de 768px)">
        <MobileSearchBar onOpenFilters={() => setDrawer(true)} activeFilters={2} />
        <div className="-mx-4 md:mx-0">
          <MobileTopBar title="Carrinho de NFTs" backTo="/" />
        </div>
        <p className="hidden text-sm text-muted-foreground md:block">Redimensione a janela para ver MobileSearchBar e MobileTopBar.</p>
      </Section>

      <Section title="Carrossel">
        <AppCarousel label="Mais desta coleção" slideClassName="basis-1/2 md:basis-1/4">
          {(["golden", "emerald", "sage", "ivory", "golden", "emerald"] as const).map((key, index) => (
            <AppCard key={index} padding="sm">
              <AppArtwork artwork={{ key, alt: `Arte ${key}` }} className="w-full rounded-sm" />
            </AppCard>
          ))}
        </AppCarousel>
      </Section>

      <Section title="Sobreposições e feedback">
        <div className="flex flex-wrap items-center gap-3">
          <AppButton variant="secondary" onClick={() => setModal(true)}>
            Abrir modal
          </AppButton>
          <AppButton variant="secondary" onClick={() => setDrawer(true)}>
            Abrir drawer
          </AppButton>
          <AppButton variant="secondary" onClick={() => setConfirm(true)}>
            Confirmar remoção
          </AppButton>
          <AppButton variant="secondary" onClick={() => toast.success("Alterações salvas.")}>
            Toast sucesso
          </AppButton>
          <AppButton variant="secondary" onClick={() => toast.error("Não foi possível salvar.")}>
            Toast erro
          </AppButton>
          <AppButton variant="secondary" onClick={() => announce("Preço de Emerald Ape #042 atualizado para 1.25 ETH")}>
            Anúncio (leitor de tela)
          </AppButton>
          <AppTooltip content="Dica de ferramenta">
            <AppButton variant="ghost">Tooltip</AppButton>
          </AppTooltip>
          <AppComingSoon badge>Criadores</AppComingSoon>
          <AppAvatar name="Nova Sato" />
          <AppAvatar />
        </div>
      </Section>

      <AppModal open={modal} onOpenChange={setModal} title="Entrar" description="Entre para gerenciar sua carteira, coleção e perfil de criador." size="sm">
        <div className="flex flex-col gap-3">
          <AppFormField label="E-mail">{(field) => <AppInput {...field} type="email" />}</AppFormField>
          <AppButton onClick={() => setModal(false)}>Entrar</AppButton>
        </div>
      </AppModal>
      <AppDrawer open={drawer} onOpenChange={setDrawer} title="Filtros" footer={<AppButton className="w-full" onClick={() => setDrawer(false)}>Aplicar</AppButton>}>
        <p className="text-sm text-muted-foreground">Conteúdo do drawer (filtros no mobile).</p>
      </AppDrawer>
      <AppConfirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Remover item do carrinho?"
        description="Emerald Ape #042 será removido."
        confirmLabel="Remover"
        destructive
        onConfirm={() => {
          setConfirm(false);
          toast.success("Item removido.");
        }}
      />
    </Container>
  );
}
