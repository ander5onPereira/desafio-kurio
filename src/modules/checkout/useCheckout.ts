import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { announce } from "@/components/shared";
import {
  availabilityConflictMetaSchema,
  quoteChangedMetaSchema,
  type CreateOrderBody,
  type Quote,
  type Wallet,
  type WalletProvider,
} from "@/contracts";
import { isApiError, type ApiError } from "@/lib/errors";
import { keys, scopeOf } from "@/lib/queryKeys";
import { useAuth } from "@/modules/auth";
import { useCart } from "@/modules/cart";
import {
  clearDraft,
  createIdempotencyKey,
  draftStorage,
  emptyDraft,
  loadDraft,
  saveDraft,
  useCreateOrder,
  usePendingOrders,
  type CheckoutDraft,
} from "@/modules/orders";
import { quoteSettings, useQuote } from "@/modules/quote";
import { useWallets } from "@/modules/wallets";
import { checkoutReducer, initialCheckoutState, isSubmitBlocked } from "./machine";
import { checkoutFormSchema, DATA_STEP_FIELDS, type CheckoutFormInput, type CheckoutFormValues } from "./schemas";
import { useWalletConnection } from "./useWalletConnection";

export type MobileStep = "data" | "wallet";

/** Erros cujo resultado é DESCONHECIDO (o pedido pode ter sido criado): reenvia com a MESMA chave. */
const UNKNOWN_OUTCOME_CODES = new Set(["TIMEOUT", "NETWORK_ERROR", "TRANSIENT", "INTERNAL", "SESSION_EXPIRED", "UNAUTHENTICATED"]);

function emptyFormValues(): CheckoutFormInput {
  return { displayName: "", username: "", profileName: "", email: "", ensName: "", referralCode: "", note: "", walletId: "" };
}

/**
 * Orquestra o checkout (PLANO §5.6): formulário (RHF + Zod), carteira/provedor/conexão simulada,
 * máquina de estados, `Idempotency-Key` por tentativa e rascunho persistido por usuário.
 *
 * Garantias:
 *  - o envio é travado localmente (`submittingRef`) E idempotente no servidor → clique repetido ou
 *    reenvio após timeout nunca cria um 2º pedido;
 *  - QUOTE_CHANGED / cotação desatualizada / conflito de estoque bloqueiam a confirmação até o usuário
 *    reconfirmar explicitamente (uma NOVA chave só nasce quando o conteúdo muda);
 *  - refresh com envio em voo retoma em `recovering` e reenvia a mesma chave;
 *  - nada do rascunho vaza entre usuários (chave por userId; o auth limpa no logout/troca).
 */
export function useCheckout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const scope = scopeOf(userId);

  const cart = useCart();
  const quote = useQuote();
  const walletsQuery = useWallets();
  const pendingOrders = usePendingOrders();
  const createOrder = useCreateOrder();
  const wallets = useMemo<Wallet[]>(() => walletsQuery.data?.items ?? [], [walletsQuery.data]);

  const [initialDraft] = useState<CheckoutDraft>(() => {
    const storage = draftStorage();
    return (storage && userId ? loadDraft(storage, userId) : null) ?? emptyDraft();
  });
  const draftRef = useRef<CheckoutDraft>(initialDraft);
  const hadDraft = useRef(initialDraft.form.email !== "" || initialDraft.walletId !== null);

  const form = useForm<CheckoutFormInput, unknown, CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    mode: "onTouched",
    defaultValues: { ...emptyFormValues(), ...initialDraft.form, walletId: initialDraft.walletId ?? "" },
  });

  const [state, dispatch] = useReducer(checkoutReducer, initialCheckoutState);
  const [step, setStep] = useState<MobileStep>(initialDraft.step === "wallet" ? "wallet" : "data");
  // Escolha explícita do usuário; sem ela, vale o tipo da carteira selecionada (derivado, sem efeito).
  const [providerChoice, setProvider] = useState<WalletProvider | null>(initialDraft.provider);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const walletId = useWatch({ control: form.control, name: "walletId" });
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId) ?? null;
  const provider: WalletProvider | null = providerChoice ?? selectedWallet?.walletType ?? null;
  const connection = useWalletConnection({
    walletId: selectedWallet?.id ?? null,
    provider,
    network: selectedWallet?.network ?? null,
  });

  const persist = useCallback(
    (patch: Partial<CheckoutDraft> = {}) => {
      const storage = draftStorage();
      if (!storage || !userId) return;
      const values = form.getValues();
      const { walletId: currentWalletId, ...collector } = values;
      draftRef.current = {
        ...draftRef.current,
        form: { ...draftRef.current.form, ...Object.fromEntries(Object.entries(collector).map(([k, v]) => [k, v ?? ""])) },
        walletId: currentWalletId || null,
        ...patch,
      };
      saveDraft(storage, userId, draftRef.current);
    },
    [form, userId],
  );

  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !walletsQuery.isSuccess || !user) return;
    prefilled.current = true;
    const current = form.getValues();
    const primary = wallets.find((wallet) => wallet.role === "primary") ?? wallets[0];
    const stored = wallets.find((wallet) => wallet.id === current.walletId);
    if (hadDraft.current) {
      if (!stored && primary) form.setValue("walletId", primary.id);
      return;
    }
    form.reset({
      displayName: user.displayName,
      username: user.username,
      profileName: primary?.profileName ?? user.displayName,
      email: user.email,
      ensName: user.ensName ?? primary?.ensName ?? "",
      referralCode: primary?.referralCode ?? "",
      note: "",
      walletId: primary?.id ?? "",
    });
  }, [walletsQuery.isSuccess, wallets, user, form]);

  useEffect(() => {
    if (!selectedWallet) return;
    quoteSettings.setNetwork(selectedWallet.network);
  }, [selectedWallet]);

  useEffect(() => {
    // form.subscribe (RHF ≥ 7.55): observa os valores sem o `watch()`, que o React Compiler não memoiza.
    return form.subscribe({ formState: { values: true }, callback: () => persist() });
  }, [form, persist]);
  useEffect(() => persist({ step, provider }), [step, provider, persist]);

  useEffect(() => {
    if (initialDraft.inFlight && initialDraft.reviewed) {
      dispatch({ type: "RESTORE_IN_FLIGHT", reviewed: initialDraft.reviewed });
    }
  }, [initialDraft]);

  useEffect(() => {
    if (quote.data && !quote.isPlaceholderData) dispatch({ type: "LIVE_QUOTE", quote: quote.data });
  }, [quote.data, quote.isPlaceholderData]);

  const selectWallet = (id: string) => {
    form.setValue("walletId", id, { shouldValidate: true, shouldDirty: true });
    const wallet = wallets.find((candidate) => candidate.id === id);
    if (wallet) setProvider(wallet.walletType);
  };

  const goToWalletStep = async () => {
    const valid = await form.trigger([...DATA_STEP_FIELDS]);
    if (valid) setStep("wallet");
    else announce("Corrija os campos destacados para continuar.", "assertive");
  };

  const startReview = async () => {
    setSubmitError(null);
    const valid = await form.trigger();
    if (!valid) {
      announce("Corrija os campos destacados para continuar.", "assertive");
      const firstInvalid = Object.keys(form.formState.errors)[0];
      if (firstInvalid) form.setFocus(firstInvalid as keyof CheckoutFormInput);
      return;
    }
    if (!selectedWallet || !provider) {
      toast.error("Selecione uma carteira e um provedor.");
      return;
    }
    if (!connection.isConnected) {
      toast.error("Conecte a carteira antes de confirmar a compra.");
      return;
    }
    const fresh = await quote.refetch();
    const latest = fresh.data;
    if (!latest || !latest.purchasable) {
      toast.error("Há itens indisponíveis no carrinho. Revise antes de continuar.");
      return;
    }
    // Conteúdo novo → tentativa nova → chave nova.
    persist({ idempotencyKey: createIdempotencyKey(), reviewed: latest, inFlight: false, orderId: null });
    dispatch({ type: "REVIEW", quote: latest });
  };

  const buildBody = (reviewed: Quote): CreateOrderBody | null => {
    const values = form.getValues();
    const wallet = wallets.find((candidate) => candidate.id === values.walletId) ?? selectedWallet;
    if (!wallet) return null;
    const { walletId: _walletId, ...collector } = values;
    return {
      quoteId: reviewed.id,
      quoteRevision: reviewed.revision,
      walletId: wallet.id,
      provider: provider ?? wallet.walletType,
      network: wallet.network,
      collector: { ...collector, note: collector.note?.trim() || undefined },
    };
  };

  const handleFailure = (error: unknown) => {
    if (!isApiError(error)) {
      dispatch({ type: "SUBMIT_REJECTED" });
      setSubmitError("Não foi possível enviar o pedido.");
      return;
    }
    if (error.code === "QUOTE_CHANGED") {
      const meta = quoteChangedMetaSchema.safeParse(error.meta);
      if (meta.success) {
        persist({ inFlight: false });
        dispatch({ type: "QUOTE_CHANGED", latest: meta.data.quote });
        void queryClient.invalidateQueries({ queryKey: keys.quotes(scope) });
        announce("Os valores mudaram. Revise antes de confirmar.", "assertive");
        return;
      }
    }
    if (error.code === "AVAILABILITY_CONFLICT") {
      const meta = availabilityConflictMetaSchema.safeParse(error.meta);
      persist({ inFlight: false });
      dispatch({ type: "AVAILABILITY_CONFLICT", conflicts: meta.success ? meta.data.items : [] });
      void queryClient.invalidateQueries({ queryKey: keys.cart(scope) });
      void queryClient.invalidateQueries({ queryKey: keys.quotes(scope) });
      announce("Alguns itens ficaram sem disponibilidade.", "assertive");
      return;
    }
    if (UNKNOWN_OUTCOME_CODES.has(error.code)) {
      // O pedido PODE ter sido criado. Mantém `inFlight` e a MESMA chave para recuperar o mesmo pedido.
      dispatch({ type: "SUBMIT_UNKNOWN", message: unknownOutcomeMessage(error) });
      announce("Não recebemos a resposta do servidor. Você pode tentar novamente sem risco de compra duplicada.", "assertive");
      return;
    }
    persist({ inFlight: false });
    for (const [field, messages] of Object.entries(error.fieldErrors)) {
      const message = messages[0];
      if (message) form.setError(field as keyof CheckoutFormInput, { message });
    }
    dispatch({ type: "SUBMIT_REJECTED" });
    setSubmitError(error.message);
    toast.error(error.message);
  };

  const submit = async () => {
    if (submittingRef.current) return;
    if (state.status !== "reviewing" && state.status !== "recovering") return;
    const reviewed = state.reviewed;
    const body = buildBody(reviewed);
    if (!body) return;

    submittingRef.current = true;
    setSubmitError(null);
    dispatch({ type: "SUBMIT" });
    persist({ inFlight: true, reviewed });
    try {
      const { order } = await createOrder.mutateAsync({ body, idempotencyKey: draftRef.current.idempotencyKey });
      dispatch({ type: "SUBMITTED", orderId: order.id });
      const storage = draftStorage();
      if (storage && userId) clearDraft(storage, userId);
      void queryClient.invalidateQueries({ queryKey: keys.pendingOrders(scope) });
      await navigate({ to: "/pedidos/$orderId", params: { orderId: order.id }, replace: true });
    } catch (error) {
      handleFailure(error);
    } finally {
      submittingRef.current = false;
    }
  };

  const reconfirm = () => {
    if (state.status !== "needsReconfirm") return;
    if (state.latest) persist({ idempotencyKey: createIdempotencyKey(), reviewed: state.latest, inFlight: false });
    dispatch({ type: "RECONFIRM" });
  };

  const edit = () => {
    persist({ reviewed: null, inFlight: false });
    dispatch({ type: "EDIT" });
  };

  const pendingOrder = pendingOrders.data?.[0] ?? null;

  return {
    form,
    state,
    step,
    setStep,
    goToWalletStep,
    startReview,
    submit,
    reconfirm,
    edit,
    submitError,
    isSubmitting: state.status === "submitting",
    submitBlocked: isSubmitBlocked(state) || pendingOrder !== null,
    cart,
    quote,
    wallets,
    walletsQuery,
    selectedWallet,
    selectWallet,
    provider,
    setProvider,
    connection,
    pendingOrder,
  };
}

function unknownOutcomeMessage(error: ApiError): string {
  if (error.code === "TIMEOUT") return "A conexão demorou demais. O pedido pode ter sido registrado.";
  if (error.code === "NETWORK_ERROR") return "A conexão caiu durante o envio. O pedido pode ter sido registrado.";
  return "Não conseguimos confirmar o envio. O pedido pode ter sido registrado.";
}
