import { useState } from "react";
import { AppButton, AppCheckbox, AppError, AppSkeleton, AppSkeletonGroup } from "@/components/ui";
import type { Wallet, WalletRole } from "@/contracts";
import { useAuth } from "@/modules/auth";
import { useWallets } from "../hooks";
import { copyFromPrimary, type WalletFormDefaults } from "../schemas";
import { WalletForm } from "./WalletForm";

function useNewWalletDefaults(role: WalletRole): WalletFormDefaults {
  const { user } = useAuth();
  return {
    role,
    displayName: user?.displayName ?? "",
    profileName: user?.displayName ?? "",
    email: user?.email ?? "",
    ensName: user?.ensName ?? "",
    nickname: role === "primary" ? "Principal" : "Reserva",
    secondaryRef: "",
    referralCode: "",
  };
}

function WalletsSkeleton() {
  return (
    <AppSkeletonGroup label="Carregando carteiras" className="flex flex-col gap-8">
      <AppSkeleton className="h-6 w-48" />
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <AppSkeleton className="h-5 w-36" />
            <AppSkeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <AppSkeleton className="h-10 w-40" />
    </AppSkeletonGroup>
  );
}

function PrimaryWalletSection({ wallet }: { wallet?: Wallet }) {
  const defaults = useNewWalletDefaults("primary");
  return (
    <section aria-labelledby="carteira-principal" className="flex flex-col gap-5">
      <div>
        <h2 id="carteira-principal" className="text-base font-bold text-foreground">
          Carteira principal
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
        </p>
      </div>
      <WalletForm key={wallet?.id ?? "nova-principal"} walletRole="primary" wallet={wallet} defaults={defaults} />
    </section>
  );
}

function SecondaryWalletSection({ wallet, primary }: { wallet?: Wallet; primary?: Wallet }) {
  const newDefaults = useNewWalletDefaults("secondary");
  const [adding, setAdding] = useState(false);
  const [sameAsPrimary, setSameAsPrimary] = useState(false);

  const showForm = Boolean(wallet) || adding;
  const defaults = sameAsPrimary && primary ? copyFromPrimary(primary, "secondary") : newDefaults;

  return (
    <section aria-labelledby="carteira-secundaria" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="carteira-secundaria" className="text-base font-bold text-foreground">
          Carteira secundária
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <AppCheckbox
            label="Igual à carteira principal"
            checked={sameAsPrimary}
            disabled={!primary}
            onCheckedChange={(checked) => {
              setSameAsPrimary(checked === true);
              if (checked === true && !wallet) setAdding(true);
            }}
          />
          {!showForm && (
            <AppButton variant="link" size="md" onClick={() => setAdding(true)}>
              Adicionar
            </AppButton>
          )}
        </div>
      </div>

      {!showForm ? (
        <p className="text-sm text-muted-foreground">Você ainda não adicionou uma carteira secundária.</p>
      ) : (
        <WalletForm
          key={`${wallet?.id ?? "nova-secundaria"}-${sameAsPrimary ? "copia" : "livre"}`}
          walletRole="secondary"
          wallet={wallet}
          defaults={defaults}
          locked={sameAsPrimary}
          onCancel={wallet ? undefined : () => { setAdding(false); setSameAsPrimary(false); }}
        />
      )}
    </section>
  );
}

export function WalletsPage() {
  const wallets = useWallets();
  const primary = wallets.data?.items.find((item) => item.role === "primary");
  const secondary = wallets.data?.items.find((item) => item.role === "secondary");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">Carteiras</h1>
      {wallets.isError ? (
        <AppError error={wallets.error} onRetry={() => void wallets.refetch()} isRetrying={wallets.isRefetching} />
      ) : wallets.data ? (
        <>
          <PrimaryWalletSection wallet={primary} />
          <SecondaryWalletSection wallet={secondary} primary={primary} />
        </>
      ) : (
        <WalletsSkeleton />
      )}
    </div>
  );
}
