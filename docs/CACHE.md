# Cache, retry e sincronização

Política do TanStack Query (estado remoto) e a reconciliação entre REST e Socket.IO.
Fonte: `src/lib/queryClient.ts`, `src/lib/queryKeys.ts`, os `hooks.ts` de cada módulo e `src/modules/realtime/`.

## 1. Chaves e isolamento por usuário

Toda chave vem da fábrica única `keys` (`src/lib/queryKeys.ts`). Dados **privados** levam o escopo do usuário
(`userId` ou `"guest"`) na própria chave, então trocar de usuário **nunca** reaproveita o cache do anterior:

| Recurso | Chave | Visibilidade |
| --- | --- | --- |
| Listas / detalhe / relacionados / avaliações / destaque de NFTs | `['nfts', 'list'\|'detail'\|…, …]` | público (compartilhado) |
| Favoritos, carrinho, cotação, pedidos, perfil, carteiras | `['u', <userId\|guest>, …]` | privado por usuário |

Além do escopo na chave, **logout e troca de usuário** executam `queryClient.clear()`, limpam o `sessionStorage`/
`localStorage` privados (rascunho de checkout) e desconectam o socket. O servidor simulado também autoriza por token.

## 2. Política por recurso

| Recurso | `staleTime` | `gcTime` | Observações |
| --- | --- | --- | --- |
| Lista de NFTs | 30 s | 5 min | `placeholderData: keepPreviousData` (a página anterior fica na tela até a nova chegar); o `signal` do Axios cancela a requisição obsoleta |
| Detalhe do NFT | 60 s | 10 min | Pré-carregado no hover/foco do card; recebe patches de `nft.updated` |
| Relacionados / avaliações / destaque | 60 s | padrão | Avaliações só carregam ao abrir a aba |
| Favoritos | 5 min | 10 min | Mutation **otimista** com rollback |
| Perfil e carteiras | 5 min | 10 min | Mutations gravam a resposta com `setQueryData` + invalidação |
| Carrinho | **0** | padrão | Sempre revalida ao montar/focar; mutations de quantidade/remoção são otimistas, com rollback, e serializadas por escopo |
| Cotação | **0** | 1 min | Chave = cupom + rede + versão do carrinho; qualquer mudança gera nova cotação (o total oficial é SEMPRE o da API) |
| Pedido | **0** | padrão | `refetchInterval` enquanto `pending`, com backoff `min(2 s × 1.5ⁿ, 10 s)`; **para** ao ficar terminal (`confirmed`/`declined`) |
| Pedidos pendentes | 0 | padrão | Recupera o pedido após refresh/reconexão sem criar outra compra |

Padrões globais (`createQueryClient`): `staleTime` 30 s, `gcTime` 5 min, `refetchOnWindowFocus` e `refetchOnReconnect` ligados.

## 3. Retry

- **Queries:** até **2** retentativas, **somente** para falhas transitórias (`ApiError.retryable`: `NETWORK_ERROR`, `TIMEOUT`,
  `TRANSIENT`, `INTERNAL`, `RATE_LIMITED`), com backoff exponencial `min(500 ms × 2ⁿ, 4 s)` (sem jitter aleatório: mantém os
  testes determinísticos). Erros 4xx não são repetidos (não adianta).
- **Mutations:** **nunca** reexecutam sozinhas. O pedido é a exceção deliberada: o reenvio é **manual** ("Tentar novamente") e
  usa a **mesma `Idempotency-Key`**, então o servidor devolve o mesmo pedido (sem compra duplicada).
- **Sessão:** em `401 SESSION_EXPIRED` o interceptor tenta **um** refresh compartilhado (single-flight) e repete a chamada uma vez;
  se falhar, emite a expiração e o app leva ao login preservando a rota e o contexto do checkout.

## 4. Respostas obsoletas e fora de ordem

1. A chave contém os parâmetros (`{ q, collection, page… }`), então respostas de consultas diferentes **nunca** se misturam.
2. O Query repassa um `AbortSignal` ao Axios: a requisição obsoleta é cancelada.
3. Mesmo que uma resposta antiga chegue por último, ela é gravada na **sua** chave; a tela lê a chave da URL atual.
4. Teste: cenário `out-of-order` (1ª busca lenta, 2ª rápida) em `e2e/specs/catalog.spec.ts`.

## 5. Atualização otimista

| Interação | Fluxo |
| --- | --- |
| Favoritar | `onMutate` → `cancelQueries` → guarda snapshot → altera o cache → `onError`: **rollback** + toast/região ao vivo → `onSettled`: revalida |
| Quantidade / remover item do carrinho | Mesmo padrão, mutations em série para evitar corrida |

Testes: `e2e/specs/favorites.spec.ts` (falha de mutation com rollback e recuperação).

## 6. Reconciliação REST ↔ Socket.IO

Eventos: `nft.updated` e `order.updated` (envelope em `src/contracts/events.ts`; contrato completo em [CONTRACTS.md](./CONTRACTS.md)).

**Guarda de eventos** (`EventGuard`, pura e testada), na ordem:

| Veredito | Regra | Efeito |
| --- | --- | --- |
| `foreign` | `userScope` existe e ≠ usuário atual | descartado (defesa extra contra vazamento) |
| `duplicate` | `id` já visto (LRU de 500) | ignorado, **sem reaplicar efeitos** (toast, aviso) |
| `stale` | `version` ≤ última versão conhecida do recurso | descartado: **nunca regride** um estado mais novo |
| `apply` | demais | grava no cache e dispara efeitos **uma vez** |

**Versões também valem no REST:** uma resposta REST mais antiga que a versão já conhecida não sobrescreve o cache (um "piso"
por NFT corrige respostas atrasadas; `pickNewestOrder`/`mergeOrderIntoCache` fazem o mesmo para pedidos).

**Onde o `nft.updated` entra:** lista, detalhe, destaque e relacionados (patch no cache), e carrinho/cotação (invalidação). O carrinho
mostra o aviso `role="status"` com o antes/depois e a cotação é recalculada; no checkout a confirmação com cotação desatualizada
é recusada (`409 QUOTE_CHANGED`) e exige **nova confirmação** do usuário.

**Reconexão:** ao reconectar (`connect` após queda), o cliente chama `invalidateQueries({ refetchType: 'active' })` — os recursos
**ativos** na tela são recarregados da API (eventos perdidos na queda não são reenviados). Pedido pendente continua sendo
acompanhado pelo polling do item 2 e por `GET /orders?status=pending`.

**Ciclo de vida:** a conexão é singleton, com contagem de referências; listeners e a conexão são liberados quando não há mais
interessados, no logout e na troca de usuário. Eventos de uma sessão anterior não atualizam dados de outro usuário (`foreign`).

## 7. Testes que cobrem esta política

| Comportamento | Onde |
| --- | --- |
| Guarda de eventos (duplicata, antigo, de outro usuário) | `src/modules/realtime/realtime.test.ts` |
| Preço/estoque via socket no carrinho e checkout | `e2e/specs/realtime-checkout.spec.ts` |
| Duplicados, antigos, queda e retomada de pedido pendente | `e2e/specs/realtime-resilience.spec.ts` |
| Skeleton, erro, retry e recuperação | `e2e/specs/loading-errors.spec.ts` |
| Isolamento entre usuários | `e2e/specs/auth.spec.ts` (troca ana → bruno), `cart.spec.ts` |
