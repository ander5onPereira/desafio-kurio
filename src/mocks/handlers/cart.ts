import { endpoints } from "@/contracts";
import { addItem, mergeGuestCart, removeItem, resolveCart, toCartDto, updateItem } from "../services/cart";
import { created, ok, route } from "./route";

export const cartHandlers = (base: string) => [
  route(base, endpoints.cart.get, ({ user, guestCartId }) => ok(toCartDto(resolveCart({ user, guestCartId })))),
  route(base, endpoints.cart.addItem, ({ user, guestCartId, body }) =>
    created(addItem(resolveCart({ user, guestCartId }), body)),
  ),
  route(base, endpoints.cart.updateItem, ({ user, guestCartId, params, body }) =>
    ok(updateItem(resolveCart({ user, guestCartId }), params.itemId, body.quantity)),
  ),
  route(base, endpoints.cart.removeItem, ({ user, guestCartId, params }) =>
    ok(removeItem(resolveCart({ user, guestCartId }), params.itemId)),
  ),
  route(base, endpoints.cart.merge, ({ requireUser, body }) => {
    const user = requireUser();
    return ok(mergeGuestCart(resolveCart({ user, guestCartId: null }), body.guestCartId));
  }),
];
