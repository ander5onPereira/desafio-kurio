import { useState } from "react";
import { Copy, ExternalLink, MailOpen } from "lucide-react";
import { toast } from "sonner";
import { AppButton, AppModal } from "@/components/ui";
import { AppArtwork, AppEthAmount } from "@/components/shared";
import { NETWORK_LABELS, WALLET_PROVIDER_LABELS, type Order } from "@/contracts";

/** "29 Jul, 2026" (formato do Figma). */
export function formatReceiptDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const month = get("month").replace(".", "");
  return `${get("day")} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${get("year")}`;
}

/** 0xA91F…E82C */
function abbreviateHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash;
}

/**
 * Recibo = SNAPSHOT do pedido (valores gravados na compra). Alterações posteriores no catálogo
 * NÃO mudam nada aqui: tudo vem de `order.lines` / `order.total`, nunca do catálogo.
 */
export function ReceiptContent({ order }: { order: Order }) {
  const [explorerOpen, setExplorerOpen] = useState(false);
  const network = NETWORK_LABELS[order.wallet.network];

  const copyHash = async () => {
    if (!order.txHash) return;
    try {
      await navigator.clipboard.writeText(order.txHash);
      toast.success("ID da transação copiado");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto manualmente.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 border-b border-border pb-6 text-center">
        <MailOpen className="size-14 text-primary" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-widest text-accent-foreground">Thank you</p>
        <p className="text-base font-semibold text-muted-foreground">Seus NFTs agora estão na sua carteira</p>
      </div>

      <dl className="flex flex-wrap justify-between gap-x-6 gap-y-4 border-b border-border pb-5 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="font-bold text-muted-foreground">ID da transação</dt>
          <dd className="flex items-center gap-1 whitespace-nowrap text-muted-foreground">
            <span title={order.txHash ?? undefined}>{order.txHash ? abbreviateHash(order.txHash) : "—"}</span>
            {order.txHash && (
              <button
                type="button"
                onClick={() => void copyHash()}
                aria-label="Copiar ID da transação"
                className="inline-flex size-6 items-center justify-center rounded-xs text-accent-foreground hover:bg-background"
              >
                <Copy className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground">Data</dt>
          <dd className="text-muted-foreground">
            <time dateTime={order.updatedAt}>{formatReceiptDate(order.updatedAt)}</time>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="text-muted-foreground">
            <AppEthAmount value={order.total} tone="muted" size="sm" />
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-bold text-muted-foreground">Carteira</dt>
          <dd className="text-muted-foreground">{WALLET_PROVIDER_LABELS[order.wallet.provider]}</dd>
        </div>
      </dl>

      <section aria-labelledby="recibo-detalhes" className="flex flex-col gap-3">
        <h3 id="recibo-detalhes" className="text-sm font-bold text-foreground">
          Detalhes da transação
        </h3>
        <table className="w-full text-sm">
          <caption className="sr-only">Itens da transação</caption>
          <thead>
            <tr className="border-b border-border text-left text-foreground">
              <th scope="col" className="pb-2 font-semibold">
                NFTs
              </th>
              <th scope="col" className="pb-2 text-center font-semibold">
                Edições
              </th>
              <th scope="col" className="pb-2 text-right font-semibold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={`${line.nftId}:${line.editionId}`}>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <AppArtwork artwork={line.image} variant="thumb" className="size-[4.375rem] shrink-0 rounded-sm" />
                    <div className="flex min-w-0 flex-col">
                      <span className="font-bold text-foreground">{line.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ID do token: #{line.tokenId} · Edição {line.editionLabel}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-2 text-center text-xs text-muted-foreground">
                  <span className="sr-only">Quantidade: </span>(x {line.quantity})
                </td>
                <td className="text-right">
                  <AppEthAmount value={line.lineTotal} size="md" />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2} className="pt-3 text-right font-normal text-foreground">
                Taxa de rede
              </th>
              <td className="pt-3 text-right">
                <AppEthAmount value={order.networkFee} tone="foreground" size="md" />
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={2} className="pb-2 pt-1 text-right font-bold text-foreground">
                Total
              </th>
              <td className="pb-2 pt-1 text-right">
                <AppEthAmount value={order.total} size="md" />
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Transação confirmada na {network}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
      </p>

      <div className="flex justify-center">
        <AppButton rightIcon={<ExternalLink className="size-4" aria-hidden="true" />} onClick={() => setExplorerOpen(true)}>
          Ver no Etherscan
        </AppButton>
      </div>

      <AppModal
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        title="Link simulado"
        description="Esta é uma demonstração: a referência da transação e o link do explorador são simulados e não existem na blockchain."
        size="sm"
      >
        <p className="break-all text-sm text-muted-foreground">{order.explorerUrl ?? "Sem link disponível."}</p>
      </AppModal>
    </div>
  );
}
