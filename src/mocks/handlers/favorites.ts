import { endpoints } from "@/contracts";
import { addFavorite, listFavorites, removeFavorite } from "../services/favorites";
import { ok, route } from "./route";

export const favoriteHandlers = (base: string) => [
  route(base, endpoints.favorites.list, ({ requireUser }) => ok(listFavorites(requireUser().id))),
  route(base, endpoints.favorites.add, ({ requireUser, params }) => ok(addFavorite(requireUser().id, params.nftId))),
  route(base, endpoints.favorites.remove, ({ requireUser, params }) =>
    ok(removeFavorite(requireUser().id, params.nftId)),
  ),
];
