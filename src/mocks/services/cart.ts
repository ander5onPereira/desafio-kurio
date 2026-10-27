import type { AddCartItemBody, Cart, CartItem, LineStatus, MergeCartResponse } from "@/contracts";
import { compareEth, mulEth } from "@/lib/money";
import { getDb, mutate } from "../db/store";
import type { DbCart, DbCartItem, DbUser } from "../db/types";
import { clock } from "../lib/clock";
import { ServerError, notFound } from "./errors";
import { editionState, requireCatalogNft } from "./views";

/**
 * Carrinho único para visitante (header X-Cart-Id) e usuário (token). O id do item é
 * `${nftId}:${editionId}`. O estado de cada linha (preço mudou, limitado, indisponível) é
 * SEMPRE derivado do estoque/preço atuais — por isso muda sozinho quando um NFT é atualizado.
 */
export const itemIdOf = (nftId: string, editionId: string) => `${nftId}:${editionId}`;

export interface CartOwner {
  user: DbUser | null;
  guestCartId: string | null;
}

export function resolveCart(owner: CartOwner): DbCart {
  const id = owner.user?.id ?? owner.guestCartId;
  if (!id) {
    throw new ServerError(400, "VALIDATION_ERROR", "Informe o cabeçalho X-Cart-Id.", {
      fieldErrors: { "X-Cart-Id": ["Obrigatório para visitantes."] },
    });
  }
  return mutate((db) => {
    let cart = db.carts[id];
    if (!cart) {
      cart = { id, ownerUserId: owner.user?.id ?? null, items: [], version: 0, updatedAt: clock.iso() };
      db.carts[id] = cart;
    }
    return cart;
  });
}

export interface LineInfo {
  item: DbCartItem;
  name: string;
  tokenId: string;
  editionLabel: string;
  image: { key: CartItem["image"]["key"]; alt: string };
  unitPrice: string;
  available: number;
  maxQuantity: number;
  status: LineStatus;
  nftVersion: number;
}

export function lineInfo(item: DbCartItem): LineInfo {
  const catalog = requireCatalogNft(item.nftId);
  const edition = editionState(item.nftId, item.editionId);
  const label = catalog.editions.find((e) => e.id === item.editionId)?.label ?? item.editionId;
  const available = edition?.available ?? 0;
  const unitPrice = edition?.price ?? "0";
  const maxQuantity = Math.min(available, catalog.maxPerOrder);
  let status: LineStatus = "ok";
  if (available === 0) status = "unavailable";
  else if (item.quantity > maxQuantity) status = "limited";
  else if (compareEth(unitPrice, item.priceAtAdd) !== 0) status = "price-changed";
  return {
    item,
    name: catalog.name,
    tokenId: catalog.tokenId,
    editionLabel: label,
    image: { key: catalog.artwork, alt: catalog.alt },
    unitPrice,
    available,
    maxQuantity,
    status,
    nftVersion: getDb().nftState[item.nftId]?.version ?? 0,
  };
}

export function toCartDto(cart: DbCart): Cart {
  const items: CartItem[] = cart.items.map((item) => {
    const info = lineInfo(item);
    return {
      id: itemIdOf(item.nftId, item.editionId),
      nftId: item.nftId,
      editionId: item.editionId,
      quantity: item.quantity,
      name: info.name,
      tokenId: info.tokenId,
      editionLabel: info.editionLabel,
      image: info.image,
      unitPrice: info.unitPrice,
      lineTotal: mulEth(info.unitPrice, item.quantity),
      available: info.available,
      maxQuantity: info.maxQuantity,
      status: info.status,
      priceChangedFrom: info.status === "price-changed" ? item.priceAtAdd : null,
      nftVersion: info.nftVersion,
    };
  });
  return {
    id: cart.id,
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    version: cart.version,
    updatedAt: cart.updatedAt,
  };
}

function conflict(nftId: string, editionId: string, requested: number, available: number): ServerError {
  const catalog = requireCatalogNft(nftId);
  return new ServerError(409, "AVAILABILITY_CONFLICT", `Quantidade indisponível para ${catalog.name}. Máximo: ${available}.`, {
    meta: { items: [{ nftId, editionId, name: catalog.name, requested, available }] },
  });
}

const touch = (cart: DbCart) => {
  cart.version += 1;
  cart.updatedAt = clock.iso();
};

function requireEdition(nftId: string, editionId: string) {
  const catalog = requireCatalogNft(nftId);
  if (!catalog.editions.some((e) => e.id === editionId)) throw notFound("Edição");
  return catalog;
}

export function addItem(cart: DbCart, body: AddCartItemBody): Cart {
  const catalog = requireEdition(body.nftId, body.editionId);
  const edition = editionState(body.nftId, body.editionId);
  const max = Math.min(edition?.available ?? 0, catalog.maxPerOrder);
  mutate(() => {
    const existing = cart.items.find((i) => i.nftId === body.nftId && i.editionId === body.editionId);
    const desired = (existing?.quantity ?? 0) + body.quantity;
    if (desired > max) throw conflict(body.nftId, body.editionId, desired, max);
    const priceAtAdd = edition?.price ?? "0";
    if (existing) {
      existing.quantity = desired;
      existing.priceAtAdd = priceAtAdd;
    } else {
      cart.items.push({ nftId: body.nftId, editionId: body.editionId, quantity: body.quantity, priceAtAdd });
    }
    touch(cart);
  });
  return toCartDto(cart);
}

export function updateItem(cart: DbCart, itemId: string, quantity: number): Cart {
  const item = cart.items.find((i) => itemIdOf(i.nftId, i.editionId) === itemId);
  if (!item) throw notFound("Item do carrinho");
  const catalog = requireCatalogNft(item.nftId);
  const edition = editionState(item.nftId, item.editionId);
  const max = Math.min(edition?.available ?? 0, catalog.maxPerOrder);
  mutate(() => {
    if (quantity > max) throw conflict(item.nftId, item.editionId, quantity, max);
    item.quantity = quantity;
    // Alterar a quantidade conta como "ciente do preço atual".
    item.priceAtAdd = edition?.price ?? item.priceAtAdd;
    touch(cart);
  });
  return toCartDto(cart);
}

export function removeItem(cart: DbCart, itemId: string): Cart {
  mutate(() => {
    cart.items = cart.items.filter((i) => itemIdOf(i.nftId, i.editionId) !== itemId);
    touch(cart);
  });
  return toCartDto(cart);
}

/** Remove SÓ as quantidades compradas (itens parcialmente comprados ficam com o restante). */
export function removePurchased(cart: DbCart, purchased: Array<{ nftId: string; editionId: string; quantity: number }>): void {
  mutate(() => {
    for (const bought of purchased) {
      const item = cart.items.find((i) => i.nftId === bought.nftId && i.editionId === bought.editionId);
      if (!item) continue;
      item.quantity -= bought.quantity;
    }
    cart.items = cart.items.filter((i) => i.quantity > 0);
    touch(cart);
  });
}

/** Mescla o carrinho de visitante no do usuário respeitando estoque/limite. */
export function mergeGuestCart(userCart: DbCart, guestCartId: string): MergeCartResponse {
  const adjustments: MergeCartResponse["adjustments"] = [];
  mutate((db) => {
    const guest = db.carts[guestCartId];
    if (!guest || guest.ownerUserId !== null || guest.id === userCart.id) return;
    for (const item of guest.items) {
      const catalog = requireCatalogNft(item.nftId);
      const edition = editionState(item.nftId, item.editionId);
      const max = Math.min(edition?.available ?? 0, catalog.maxPerOrder);
      const existing = userCart.items.find((i) => i.nftId === item.nftId && i.editionId === item.editionId);
      const desired = (existing?.quantity ?? 0) + item.quantity;
      const id = itemIdOf(item.nftId, item.editionId);
      if (max === 0) {
        adjustments.push({ itemId: id, code: "UNAVAILABLE", message: `${catalog.name} está indisponível e não foi adicionado.` });
        continue;
      }
      const allowed = Math.min(desired, max);
      if (allowed < desired) {
        adjustments.push({ itemId: id, code: "LIMITED", message: `${catalog.name}: quantidade ajustada para ${allowed} (limite disponível).` });
      }
      const priceAtAdd = edition?.price ?? item.priceAtAdd;
      if (existing) {
        existing.quantity = allowed;
        existing.priceAtAdd = priceAtAdd;
      } else {
        userCart.items.push({ nftId: item.nftId, editionId: item.editionId, quantity: allowed, priceAtAdd });
      }
    }
    delete db.carts[guestCartId];
    touch(userCart);
  });
  return { cart: toCartDto(userCart), adjustments };
}
