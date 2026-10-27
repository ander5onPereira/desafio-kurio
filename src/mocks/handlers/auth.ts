import { endpoints } from "@/contracts";
import { login, logout, refresh, register, toUserDto } from "../services/auth";
import { created, noContent, ok, route } from "./route";

/** /auth/* — cadastro, login, refresh (com rotação), logout e restauração da sessão. */
export const authHandlers = (base: string) => [
  route(base, endpoints.auth.register, async ({ body }) => created(await register(body))),
  route(base, endpoints.auth.login, async ({ body }) => ok(await login(body))),
  route(base, endpoints.auth.refresh, ({ body }) => ok(refresh(body.refreshToken))),
  route(base, endpoints.auth.logout, ({ accessToken }) => {
    if (accessToken) logout(accessToken);
    return noContent();
  }),
  route(base, endpoints.auth.me, ({ requireUser }) => ok(toUserDto(requireUser()))),
];
