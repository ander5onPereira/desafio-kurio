import { Link } from "@tanstack/react-router";
import { CircleCheck, CircleX, Loader2, Unplug } from "lucide-react";
import { AppButton, AppRadioCard, AppRadioGroup } from "@/components/ui";
import {
  NETWORK_LABELS,
  WALLET_PROVIDERS,
  WALLET_PROVIDER_LABELS,
  type Wallet,
  type WalletProvider,
} from "@/contracts";
import { PROVIDER_MONOGRAM, shortAddress } from "../format";
import type { useWalletConnection } from "../useWalletConnection";

/** Carteiras cadastradas (Perfil > Carteiras): cards selecionáveis com rede e endereço/ENS. */
export function WalletPicker({
  wallets,
  selectedId,
  onSelect,
}: {
  wallets: readonly Wallet[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (wallets.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm md:rounded-sm">
        <p className="text-muted-foreground">Você ainda não cadastrou uma carteira. Cadastre uma para pagar.</p>
        <AppButton asChild variant="outline" size="sm">
          <Link to="/perfil/carteiras">Cadastrar carteira</Link>
        </AppButton>
      </div>
    );
  }
  return (
    <AppRadioGroup aria-label="Carteira cadastrada" value={selectedId ?? ""} onValueChange={onSelect}>
      {wallets.map((wallet) => (
        <AppRadioCard
          key={wallet.id}
          value={wallet.id}
          title={wallet.nickname}
          description={
            <>
              {wallet.ensName || shortAddress(wallet.address)}
              <span className="sr-only">, </span>
              <span aria-hidden="true"> · </span>
              {wallet.role === "primary" ? `Rede principal ${NETWORK_LABELS[wallet.network]}` : `Rede ${NETWORK_LABELS[wallet.network]}`}
            </>
          }
        />
      ))}
    </AppRadioGroup>
  );
}

/** Provedor da carteira (MetaMask, WalletConnect, Coinbase Wallet) — radio cards como no Figma. */
export function ProviderPicker({
  provider,
  onSelect,
}: {
  provider: WalletProvider | null;
  onSelect: (provider: WalletProvider) => void;
}) {
  return (
    <AppRadioGroup aria-label="Provedor da carteira" value={provider ?? ""} onValueChange={(value) => onSelect(value as WalletProvider)}>
      {WALLET_PROVIDERS.map((item) => (
        <AppRadioCard
          key={item}
          value={item}
          title={WALLET_PROVIDER_LABELS[item]}
          icon={<span aria-hidden="true">{PROVIDER_MONOGRAM[item]}</span>}
        />
      ))}
    </AppRadioGroup>
  );
}

type Connection = ReturnType<typeof useWalletConnection>;

/** Conexão SIMULADA: conectar, recusa (com nova tentativa) e desconectar. Mensagens em `role="status"`. */
export function ConnectionBox({ connection, networkLabel }: { connection: Connection; networkLabel: string | null }) {
  const { status } = connection;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-sm md:rounded-sm">
      <p role="status" className="flex items-start gap-2">
        {status === "connected" ? (
          <>
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              <strong>Carteira conectada</strong>
              {networkLabel ? ` · ${networkLabel}` : ""}
            </span>
          </>
        ) : status === "connecting" ? (
          <>
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-accent-foreground" aria-hidden="true" />
            <span>Conectando… confirme na sua carteira.</span>
          </>
        ) : status === "rejected" ? (
          <>
            <CircleX className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            <span className="text-danger">{connection.message ?? "A conexão foi recusada."}</span>
          </>
        ) : status === "disconnected" ? (
          <>
            <Unplug className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Carteira desconectada. Conecte novamente para continuar.</span>
          </>
        ) : (
          <span className="text-muted-foreground">Conecte sua carteira para confirmar a compra.</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {status === "connected" ? (
          <AppButton variant="outline" size="sm" onClick={connection.disconnect} isLoading={connection.isBusy}>
            Desconectar
          </AppButton>
        ) : (
          <AppButton
            size="sm"
            onClick={connection.connect}
            isLoading={status === "connecting"}
            disabled={!connection.canConnect || connection.isBusy}
          >
            {status === "rejected" ? "Tentar novamente" : "Conectar carteira"}
          </AppButton>
        )}
      </div>
    </div>
  );
}
