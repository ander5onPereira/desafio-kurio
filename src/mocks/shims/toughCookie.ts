/**
 * Substituto mínimo de `tough-cookie`, usado só no código dos mocks.
 *
 * O MSW usa `tough-cookie` (e, por baixo, `tldts` com a lista de sufixos públicos, ~250 KB) apenas
 * no seu cookie store, consultado em TODA requisição interceptada. A API simulada não usa cookies:
 * a sessão vai por token no cabeçalho (ver `modules/auth/storage.ts`). Manter o jar real custava
 * ~35% dos bytes do chunk dos mocks e CPU em cada chamada no boot. Aqui o jar é sempre vazio e
 * `Set-Cookie` de respostas simuladas é ignorado.
 *
 * Só existem os membros que o MSW importa (`Cookie`, `CookieJar`, `MemoryCookieStore`). Ligado por
 * alias em `vite.config.ts`; se algum dia a demo precisar de cookies, remova o alias.
 */
export class Cookie {
  static fromJSON(_json: unknown): Cookie | null {
    return null;
  }
}

export class MemoryCookieStore {
  idx: Record<string, never> = {};
}

export class CookieJar {
  constructor(_store?: MemoryCookieStore) {}

  getCookiesSync(_url: string): Cookie[] {
    return [];
  }

  async setCookie(_cookie: unknown, _url: string): Promise<void> {}
}
