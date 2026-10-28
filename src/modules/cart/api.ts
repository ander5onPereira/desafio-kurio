import { callEndpoint } from "@/lib/api";
import { endpoints, type AddCartItemBody, type UpdateCartItemBody } from "@/contracts";

export const fetchCart = (signal?: AbortSignal) => callEndpoint(endpoints.cart.get, { signal });

export const addCartItem = (body: AddCartItemBody) => callEndpoint(endpoints.cart.addItem, { body });

export const updateCartItem = (itemId: string, body: UpdateCartItemBody) =>
  callEndpoint(endpoints.cart.updateItem, { params: { itemId }, body });

export const removeCartItem = (itemId: string) => callEndpoint(endpoints.cart.removeItem, { params: { itemId } });

export const mergeCart = (guestCartId: string) => callEndpoint(endpoints.cart.merge, { body: { guestCartId } });
