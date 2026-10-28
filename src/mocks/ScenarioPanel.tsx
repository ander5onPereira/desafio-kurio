import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { z } from "zod";
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

const POSITION_KEY = "kurio.mockpanel.v1";
const NOTICE_KEY = "kurio.mockpanel.notice";
const DRAG_THRESHOLD = 4;
const EDGE = 4;

/** O que fazer depois de uma ação que mexe no banco: recarregar a página ou abrir outra tela. */
type Next = "reload" | { goto: string };

/**
 * A confirmação atravessa o reload (sessionStorage) para o painel reabrir mostrando o que foi aplicado.
 * Só vale para "recarregar aqui": as telas de teste de login/cadastro abrem um modal, e com um modal
 * aberto o app deixa o resto da página inerte (inclusive este painel).
 */
function leaveNotice(message: string): void {
  try {
    window.sessionStorage.setItem(NOTICE_KEY, message);
  } catch {
    /* sem storage: o painel só não reabre sozinho */
  }
}

function takeNotice(): string | null {
  try {
    const message = window.sessionStorage.getItem(NOTICE_KEY);
    window.sessionStorage.removeItem(NOTICE_KEY);
    return message;
  } catch {
    return null;
  }
}

const pointSchema = z.object({ x: z.number(), y: z.number() });
type Point = z.infer<typeof pointSchema>;

interface Drag {
  pointerId: number;
  startX: number;
  startY: number;
  origin: Point;
  width: number;
  height: number;
  moved: boolean;
  last: Point | null;
}

function loadPosition(): Point | null {
  try {
    const raw = window.localStorage.getItem(POSITION_KEY);
    const parsed = pointSchema.safeParse(raw ? JSON.parse(raw) : null);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function savePosition(point: Point | null): void {
  try {
    if (point) window.localStorage.setItem(POSITION_KEY, JSON.stringify(point));
    else window.localStorage.removeItem(POSITION_KEY);
  } catch {
    /* sem storage: a posição só não sobrevive ao refresh */
  }
}

const clientWidth = () => document.documentElement.clientWidth;
const clientHeight = () => document.documentElement.clientHeight;

const subscribeViewport = (notify: () => void) => {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
};

function clampToViewport(point: Point, drag: Drag): Point {
  return {
    x: Math.min(Math.max(point.x, EDGE), Math.max(EDGE, clientWidth() - drag.width - EDGE)),
    y: Math.min(Math.max(point.y, EDGE), Math.max(EDGE, clientHeight() - drag.height - EDGE)),
  };
}

/**
 * Posição do botão e do diálogo. Sem arrasto o botão fica no canto inferior esquerdo; arrastado,
 * `min()` em CSS mantém uma parte dele visível se a janela encolher. O diálogo abre para o lado
 * com mais espaço (acima na metade de baixo da tela) e é empurrado para dentro da tela à direita.
 */
function layoutFor(position: Point | null, viewportHeight: number) {
  if (!position) {
    const container: CSSProperties = { left: 12, bottom: 12 };
    const dialog: CSSProperties = { maxHeight: "min(80dvh, calc(100dvh - 4.5rem))" };
    return { container, dialog, above: true };
  }
  const left = `min(${position.x}px, calc(100vw - 3rem))`;
  const top = `min(${position.y}px, calc(100dvh - 2.5rem))`;
  const above = position.y > viewportHeight / 2;
  const dialog: CSSProperties = {
    maxHeight: above ? `min(80dvh, calc(${top} - 1.25rem))` : `min(80dvh, calc(100dvh - ${top} - 3.5rem))`,
    transform: `translateX(min(0px, calc(100vw - 1rem - ${left} - 100%)))`,
  };
  return { container: { left, top } satisfies CSSProperties, dialog, above };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-3">
      <h3 className="mb-2 text-xs font-bold text-accent-foreground">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Panel({ control, resumed }: { control: KurioControl; resumed: string | null }) {
  const [open, setOpen] = useState(resumed !== null);
  const [scenario, setScenario] = useState<ScenarioId>(control.scenario.current());
  const [message, setMessage] = useState(resumed ?? "");
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
  const [position, setPosition] = useState<Point | null>(loadPosition);
  const drag = useRef<Drag | null>(null);
  const swallowClick = useRef(false);
  const viewportHeight = useSyncExternalStore(subscribeViewport, clientHeight);
  const titleId = useId();
  const layout = layoutFor(position, viewportHeight);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: { x: rect.left, y: rect.top },
      width: rect.width,
      height: rect.height,
      moved: false,
      last: null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = drag.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    if (!session.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    session.moved = true;
    session.last = clampToViewport({ x: session.origin.x + dx, y: session.origin.y + dy }, session);
    setPosition(session.last);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = drag.current;
    if (!session || session.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!session.moved) return;
    savePosition(session.last);
    // O click que o navegador dispara depois de um arrasto não deve abrir/fechar o painel.
    swallowClick.current = true;
    window.setTimeout(() => {
      swallowClick.current = false;
    }, 0);
  };

  const resetPosition = () => {
    setPosition(null);
    savePosition(null);
  };

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

  const run = async (label: string, action: () => Promise<void> | void, next?: Next) => {
    try {
      await action();
      const done = `✔ ${label}`;
      setMessage(done);
      if (next === "reload") {
        leaveNotice(done);
        window.location.reload();
      } else if (next) {
        window.location.assign(next.goto);
      }
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
    <div style={{ position: "fixed", zIndex: 2147483000, ...layout.container }} className="font-sans">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Mock · ${control.scenario.current()} — abrir painel de cenários`}
        title="Arraste para mover"
        onClick={() => {
          if (!swallowClick.current) setOpen((value) => !value);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ touchAction: "none" }}
        className="cursor-grab select-none rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-accent-foreground shadow-lg hover:border-primary active:cursor-grabbing"
      >
        Mock · {control.scenario.current()}
      </button>

      {open && (
        <div
          role="dialog"
          aria-labelledby={titleId}
          style={layout.dialog}
          className={`absolute left-0 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-3 overflow-y-auto rounded-md border border-border bg-card p-3 text-foreground shadow-2xl ${layout.above ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-sm font-bold">
              Servidor simulado
            </h2>
            <div className="flex gap-2">
              {position && (
                <button type="button" className={button} onClick={resetPosition}>
                  Posição original
                </button>
              )}
              <button type="button" className={button} onClick={() => setOpen(false)}>
                Fechar
              </button>
            </div>
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
            <p className="text-xs text-foreground">
              <span className="font-bold text-accent-foreground">Como ver: </span>
              {SCENARIOS[scenario].tryIt.steps}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={primaryButton} onClick={() => run("Cenário aplicado (banco restaurado)", () => control.scenario.set(scenario), "reload")}>
                Aplicar e resetar
              </button>
              <button
                type="button"
                className={button}
                title={`Aplica o cenário e abre ${SCENARIOS[scenario].tryIt.path}`}
                onClick={() => run("Cenário aplicado (banco restaurado)", () => control.scenario.set(scenario), { goto: SCENARIOS[scenario].tryIt.path })}
              >
                Aplicar e abrir a tela de teste
              </button>
              <button type="button" className={button} onClick={() => run("Comportamento trocado", () => control.scenario.set(scenario, { keepData: true }))}>
                Só comportamento
              </button>
              <button type="button" className={button} onClick={() => run("Banco restaurado", () => control.reset(), "reload")}>
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

export function mountScenarioPanel(control: KurioControl): void {
  if (document.getElementById("kurio-mock-panel")) return;
  const container = document.createElement("div");
  container.id = "kurio-mock-panel";
  document.body.appendChild(container);
  createRoot(container).render(<Panel control={control} resumed={takeNotice()} />);
}
