import { toast } from "sonner";
import { configureApiBridge } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { GUEST_SCOPE, keys, scopeOf } from "@/lib/queryKeys";
import { authStore } from "@/modules/auth";
import { mergeCart } from "./api";
import { clearGuestCartId, peekGuestCartId } from "./guestCart";

/**
 * Efeitos de módulo do carrinho (rodam uma vez, ao importar `@/modules/cart`):
 *  1. expõe o id do carrinho de visitante ao Axios (header X-Cart-Id);
 *  2. ao autenticar (anônimo → usuário, ou troca de usuário), mescla o carrinho do visitante
 *     no do usuário e descarta o id de visitante. O módulo auth não conhece o carrinho.
 */
configureApiBridge({ getGuestCartId: peekGuestCartId });

let previous = authStore.getSnapshot();
let merging = false;

async function mergeGuestIntoUser(userId: string): Promise<void> {
  const guestCartId = peekGuestCartId();
  if (!guestCartId || merging) return;
  merging = true;
  const scope = scopeOf(userId);
  try {
    await queryClient.cancelQueries({ queryKey: keys.cart(scope) });
    const { cart, adjustments } = await mergeCart(guestCartId);
    clearGuestCartId();
    queryClient.setQueryData(keys.cart(scope), cart);
    queryClient.removeQueries({ queryKey: keys.cart(GUEST_SCOPE) });
    void queryClient.invalidateQueries({ queryKey: keys.quotes(scope) });
    for (const adjustment of adjustments) toast.warning(adjustment.message);
  } catch {
    // Mantém o id de visitante: a mescla é tentada de novo no próximo login/restauração.
    toast.warning("Não foi possível mesclar seu carrinho de visitante. Tentaremos de novo.");
  } finally {
    merging = false;
  }
}

authStore.subscribe((snapshot) => {
  const becameUser =
    snapshot.status === "authenticated" &&
    snapshot.user !== null &&
    (previous.status !== "authenticated" || previous.user?.id !== snapshot.user.id);
  previous = snapshot;
  if (becameUser && snapshot.user) void mergeGuestIntoUser(snapshot.user.id);
});
