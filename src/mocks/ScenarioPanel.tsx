import { useEffect, useId, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { InjectBehavior, KurioControl, ScenarioId } from "@/contracts";
import { getDb, isDbReady } from "./db/store";
import { SCENARIOS } from "./scenarios/definitions";

/**
 * Painel flutuante do servidor simulado (só existe quando os mocks estão ligados).
 * É a face visual de `window.__kurio`: trocar cenário, resetar, mexer em NFT/pedido, controlar o
 * websocket e injetar falhas. Usa apenas elementos nativos + tokens (não depende do Design System
 * do app) e roda numa raiz React própria, fora da árvore do app.
 */
const field =
  "w-full rounded-sm border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-subtle-foreground";
const button =
  "rounded-sm border border-border bg-card px-2 py-1 text-xs text-foreground hover:border-primary focus-visible:outline-2";
const primaryButton =
  "rounded-sm bg-primary px-2 py-1 text-xs font-bold text-primary-foreground hover:bg-primary-hover";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-3">
      <h3 className="mb-2 text-xs font-bold text-accent-foreground">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Panel({ control }: { control: KurioControl }) {
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState<ScenarioId>(control.scenario.current());
  const [message, setMessage] = useState("");
  const [nftId, setNftId] = useState("emerald-ape-042");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState("");
  const [orderId, setOrderId] = useState("");
  const [injectPath, setInjectPath] = useState("/nfts*");
  const [injectKind, setInjectKind] = useState<InjectBehavior["type"]>("status");
  const [injectValue, setInjectValue] = useState("503");
  const [injectTimes, setInjectTimes] = useState("1");
  const [clockIso, setClockIso] = useState("2026-07-29T12:00:00.000Z");
  const [, tick] = useState(0);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const interval = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearInterval(interval);
    };
  }, [open]);

  const run = async (label: string, action: () => Promise<void> | void, reload = false) => {
    try {
      await action();
      setMessage(`✔ ${label}`);
      if (reload) window.location.reload();
    } catch (error) {
      setMessage(`✖ ${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const pending = isDbReady() ? Object.values(getDb().orders).filter((o) => o.order.status === "pending") : [];
  const events = control.socket.emitted().slice(-6).reverse();

  const injectBehavior = (): InjectBehavior => {
    if (injectKind === "status") return { type: "status", status: Number(injectValue) || 503 };
    if (injectKind === "delay") return { type: "delay", ms: Number(injectValue) || 2000 };
    if (injectKind === "timeout") return { type: "timeout" };
    return { type: "network-error" };
  };

  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 2147483000 }} className="font-sans">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Mock · ${control.scenario.current()} — abrir painel de cenários`}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-accent-foreground shadow-lg hover:border-primary"
      >
        Mock · {control.scenario.current()}
      </button>

      {open && (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className="mt-2 flex max-h-[80dvh] w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-3 overflow-y-auto rounded-md border border-border bg-card p-3 text-foreground shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="text-sm font-bold">
              Servidor simulado
            </h2>
            <button type="button" className={button} onClick={() => setOpen(false)}>
              Fechar
            </button>
          </div>
          <p role="status" className="min-h-4 text-xs text-muted-foreground">
            {message}
          </p>

          <Section title="Cenário">
            <label className="text-xs text-muted-foreground" htmlFor="kurio-scenario">
              Cenário ativo
            </label>
            <select id="kurio-scenario" className={field} value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioId)}>
              {control.scenario.list().map((id) => (
                <option key={id} value={id}>
                  {SCENARIOS[id].label} ({id})
                </option>
              ))}
            </select>
            <p className="text-xs text-subtle-foreground">{SCENARIOS[scenario].description}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={primaryButton} onClick={() => run("Cenário aplicado (banco restaurado)", () => control.scenario.set(scenario), true)}>
                Aplicar e resetar
              </button>
              <button type="button" className={button} onClick={() => run("Comportamento trocado", () => control.scenario.set(scenario, { keepData: true }))}>
                Só comportamento
              </button>
              <button type="button" className={button} onClick={() => run("Banco restaurado", () => control.reset(), true)}>
                Resetar
              </button>
            </div>
          </Section>

          <Section title="NFT (emite nft.updated)">
            <input aria-label="Id do NFT" className={field} value={nftId} onChange={(e) => setNftId(e.target.value)} />
            <div className="flex gap-2">
              <input aria-label="Novo preço (ETH)" placeholder="Preço ETH" className={field} value={price} onChange={(e) => setPrice(e.target.value)} />
              <input aria-label="Nova disponibilidade" placeholder="Estoque" className={field} value={available} onChange={(e) => setAvailable(e.target.value)} />
            </div>
            <button
              type="button"
              className={primaryButton}
              onClick={() =>
                run("NFT atualizado", async () => {
                  await control.nft.update(nftId, {
                    ...(price ? { price } : {}),
                    ...(available !== "" ? { available: Number(available) } : {}),
                  });
                })
              }
            >
              Atualizar NFT
            </button>
          </Section>

          <Section title="Pedido pendente">
            <select aria-label="Pedido pendente" className={field} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">{pending.length ? "Selecione…" : "Nenhum pedido pendente"}</option>
              {pending.map((record) => (
                <option key={record.order.id} value={record.order.id}>
                  {record.order.id}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="button" className={button} disabled={!orderId} onClick={() => run("Pedido confirmado", () => control.order.settle(orderId, "confirmed"))}>
                Confirmar
              </button>
              <button type="button" className={button} disabled={!orderId} onClick={() => run("Pedido recusado", () => control.order.settle(orderId, "declined"))}>
                Recusar
              </button>
            </div>
          </Section>

          <Section title="Websocket">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={button} onClick={() => run("Conexão derrubada", () => control.socket.drop())}>
                Derrubar
              </button>
              <button type="button" className={button} onClick={() => run("Conexão liberada", () => control.socket.restore())}>
                Restaurar
              </button>
              <button type="button" className={button} onClick={() => run("Evento antigo emitido", () => control.socket.emitStale(nftId))}>
                Emitir evento antigo
              </button>
            </div>
            <ul className="text-xs text-muted-foreground" aria-label="Últimos eventos emitidos">
              {events.length === 0 && <li>Nenhum evento emitido ainda.</li>}
              {events.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {event.type} · {event.resourceId} · v{event.version}
                  </span>
                  <button type="button" className={button} onClick={() => run("Evento reenviado (duplicata)", () => control.socket.replay(event.id))}>
                    Repetir
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Injetar falha">
            <input aria-label="Caminho (ex.: /nfts*)" className={field} value={injectPath} onChange={(e) => setInjectPath(e.target.value)} />
            <div className="flex gap-2">
              <select aria-label="Tipo de falha" className={field} value={injectKind} onChange={(e) => setInjectKind(e.target.value as InjectBehavior["type"])}>
                <option value="status">Status HTTP</option>
                <option value="delay">Atraso (ms)</option>
                <option value="network-error">Erro de conexão</option>
                <option value="timeout">Timeout</option>
              </select>
              <input aria-label="Valor (status ou ms)" className={field} value={injectValue} onChange={(e) => setInjectValue(e.target.value)} />
              <input aria-label="Quantas vezes" className={field} value={injectTimes} onChange={(e) => setInjectTimes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="button" className={primaryButton} onClick={() => run("Falha injetada", () => control.inject({ path: injectPath, behavior: injectBehavior(), times: Number(injectTimes) || 1 }))}>
                Injetar
              </button>
              <button type="button" className={button} onClick={() => run("Injeções limpas", () => control.clearInjections())}>
                Limpar
              </button>
            </div>
          </Section>

          <Section title="Relógio do servidor">
            <input aria-label="Data/hora ISO" className={field} value={clockIso} onChange={(e) => setClockIso(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className={button} onClick={() => run("Relógio ajustado", () => control.clock.set(clockIso))}>
                Ajustar
              </button>
              <button type="button" className={button} onClick={() => run("Relógio restaurado", () => control.clock.reset())}>
                Voltar ao real
              </button>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

/** Monta o painel numa raiz própria (fora da árvore do app). */
export function mountScenarioPanel(control: KurioControl): void {
  if (document.getElementById("kurio-mock-panel")) return;
  const container = document.createElement("div");
  container.id = "kurio-mock-panel";
  document.body.appendChild(container);
  createRoot(container).render(<Panel control={control} />);
}
