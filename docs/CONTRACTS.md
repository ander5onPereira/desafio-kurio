# Contratos — REST e eventos Socket.IO

> **Gerado automaticamente** por `npx tsx scripts/gen-contracts-doc.ts` a partir de
> `src/contracts/` (registro de endpoints + schemas Zod). Não edite à mão: mude o contrato e gere de novo.
> O MESMO registro alimenta o cliente (Axios, `callEndpoint`) e os handlers do MSW.

## Convenções

- **Base:** `/api` (`VITE_API_URL`). O MSW intercepta no navegador; não existe backend real.
- **Dinheiro:** ETH sempre **string decimal** (até 18 casas), nunca número: `"1.19"`, `"26.846"`. Quantidades são inteiros.
- **Erros:** toda resposta de erro segue `{ code, message, fieldErrors?, meta? }` (tabela abaixo). A UI decide pelo `code`, nunca pelo status HTTP.
- **Paginação:** `{ page, pageSize, total, totalPages }`; parâmetros da listagem = os mesmos nomes dos search params da URL.
- **Arrays em query:** parâmetros repetidos (`?collection=a&collection=b`).

## Cabeçalhos

| Cabeçalho | Onde | Descrição |
| --- | --- | --- |
| `Authorization: Bearer <accessToken>` | Rotas privadas | Token de acesso (curto). 401 `SESSION_EXPIRED` → refresh único e repetição. |
| `X-Cart-Id: <uuid>` | Carrinho/cotação de visitante | Identifica o carrinho do visitante (UUID no `localStorage`). Ignorado quando há token. |
| `Idempotency-Key: <uuid>` | `POST /orders` | **Obrigatório.** Mesma chave + mesmo corpo = mesmo pedido; corpo diferente = 409 `IDEMPOTENCY_KEY_REUSED`. |
| `Idempotent-Replayed: true` | Resposta de `POST /orders` | Indica que o pedido devolvido já existia (reenvio recuperado). |

## Erros

| Código | HTTP | Significado |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 / 422 | Campos inválidos; vem com `fieldErrors`. |
| `UNAUTHENTICATED` | 401 | Sem credenciais válidas. |
| `SESSION_EXPIRED` | 401 | Token vencido: o cliente tenta UM refresh e repete a chamada. |
| `FORBIDDEN` | 403 | Sem permissão para o recurso. |
| `NOT_FOUND` | 404 | Recurso inexistente (ou de outro usuário). |
| `CONFLICT` | 409 | Conflito genérico de estado. |
| `EMAIL_TAKEN` | 409 | E-mail já cadastrado (`fieldErrors.email`). |
| `USERNAME_TAKEN` | 409 | Nome de usuário já existe (`fieldErrors.username`). |
| `AVAILABILITY_CONFLICT` | 409 | Estoque/limite insuficiente; `meta.items` lista o que faltou. |
| `QUOTE_CHANGED` | 409 | Cotação mudou (preço, estoque, cupom ou taxa); `meta.quote` traz a nova — exige nova confirmação. |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Mesma `Idempotency-Key` com corpo diferente. |
| `COUPON_INVALID` | 422 | Cupom inexistente. |
| `COUPON_EXPIRED` | 422 | Cupom vencido. |
| `WALLET_REJECTED` | 422 | Conexão da carteira recusada pelo usuário (simulação). |
| `RATE_LIMITED` | 429 | Muitas requisições; vale tentar de novo. |
| `TRANSIENT` | 500 / 502 / 503 / 504 | Falha transitória do servidor; vale tentar de novo. |
| `INTERNAL` | 500 | Erro interno. |

Códigos gerados só no cliente (nunca vêm da API): `NETWORK_ERROR`, `TIMEOUT`, `INVALID_RESPONSE`, `UNKNOWN` (sem resposta, tempo esgotado, resposta fora do contrato, desconhecido).

## Endpoints REST

### Sessão e conta

#### `POST /auth/register`

Cria conta e já inicia a sessão. 409 EMAIL_TAKEN / USERNAME_TAKEN; 422 VALIDATION_ERROR.

- **Acesso:** pública

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `username` | string | sim | padrão `^[a-z0-9_.]+$`, mín. 3 car., máx. 24 car. |
| `email` | string (email) | sim |  |
| `password` | string | sim | mín. 8 car. |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `accessToken` | string | sim |  |
| `refreshToken` | string | sim |  |
| `expiresAt` | string (date-time) | sim |  |
| `user` | object | sim |  |
| `user.id` | string | sim | mín. 1 car. |
| `user.username` | string | sim |  |
| `user.displayName` | string | sim |  |
| `user.email` | string (email) | sim |  |
| `user.avatarUrl` | string \| null | sim |  |
| `user.ensName` | string \| null | sim |  |
| `user.walletNickname` | string \| null | sim |  |
| `user.createdAt` | string (date-time) | sim |  |

#### `POST /auth/login`

Autentica. 401 UNAUTHENTICATED com credenciais inválidas.

- **Acesso:** pública

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `email` | string (email) | sim |  |
| `password` | string | sim | mín. 1 car. |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `accessToken` | string | sim |  |
| `refreshToken` | string | sim |  |
| `expiresAt` | string (date-time) | sim |  |
| `user` | object | sim |  |
| `user.id` | string | sim | mín. 1 car. |
| `user.username` | string | sim |  |
| `user.displayName` | string | sim |  |
| `user.email` | string (email) | sim |  |
| `user.avatarUrl` | string \| null | sim |  |
| `user.ensName` | string \| null | sim |  |
| `user.walletNickname` | string \| null | sim |  |
| `user.createdAt` | string (date-time) | sim |  |

#### `POST /auth/refresh`

Troca o refreshToken por novos tokens (rotação). 401 SESSION_EXPIRED se inválido/expirado.

- **Acesso:** pública

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `refreshToken` | string | sim |  |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `accessToken` | string | sim |  |
| `refreshToken` | string | sim |  |
| `expiresAt` | string (date-time) | sim |  |

#### `POST /auth/logout`

Invalida a sessão (204).

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

_sem corpo (204)_

#### `GET /auth/me`

Usuário da sessão atual (restaura a sessão após refresh). 401 SESSION_EXPIRED se o token venceu.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `username` | string | sim |  |
| `displayName` | string | sim |  |
| `email` | string (email) | sim |  |
| `avatarUrl` | string \| null | sim |  |
| `ensName` | string \| null | sim |  |
| `walletNickname` | string \| null | sim |  |
| `createdAt` | string (date-time) | sim |  |

### NFTs

#### `GET /nfts`

Catálogo com busca, filtros combináveis, ordenação, abas e paginação + facetas (contagens).

- **Acesso:** pública

**Query**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `q` | string | não |  |
| `collection` | string[] | não |  |
| `network` | `ethereum` \| `polygon` \| `solana`[] | não |  |
| `minPrice` | string | não | padrão `^\d+(\.\d{1,18})?$` |
| `maxPrice` | string | não | padrão `^\d+(\.\d{1,18})?$` |
| `sort` | `recent` \| `price-asc` \| `price-desc` \| `name` | não |  |
| `tab` | `all` \| `new` \| `trending` | não |  |
| `page` | integer | não | mín. 1, máx. 9007199254740991 |
| `pageSize` | integer | não | mín. 1, máx. 48 |

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `items` | object[] | sim |  |
| `items[].id` | string | sim | mín. 1 car. |
| `items[].tokenId` | string | sim |  |
| `items[].name` | string | sim |  |
| `items[].image` | object | sim |  |
| `items[].image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `items[].image.alt` | string | sim | mín. 1 car. |
| `items[].price` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].compareAtPrice` | string \| null | sim |  |
| `items[].rare` | boolean | sim |  |
| `items[].collection` | object | sim |  |
| `items[].collection.id` | string | sim | mín. 1 car. |
| `items[].collection.name` | string | sim |  |
| `items[].network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `items[].available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].createdAt` | string (date-time) | sim |  |
| `pagination` | object | sim |  |
| `pagination.page` | integer | sim | mín. 1, máx. 9007199254740991 |
| `pagination.pageSize` | integer | sim | mín. 1, máx. 9007199254740991 |
| `pagination.total` | integer | sim | mín. 0, máx. 9007199254740991 |
| `pagination.totalPages` | integer | sim | mín. 0, máx. 9007199254740991 |
| `facets` | object | sim |  |
| `facets.collections` | object[] | sim |  |
| `facets.collections[].id` | string | sim | mín. 1 car. |
| `facets.collections[].name` | string | sim |  |
| `facets.collections[].count` | integer | sim | mín. 0, máx. 9007199254740991 |
| `facets.networks` | object[] | sim |  |
| `facets.networks[].id` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `facets.networks[].name` | string | sim |  |
| `facets.networks[].count` | integer | sim | mín. 0, máx. 9007199254740991 |
| `facets.priceRange` | object | sim |  |
| `facets.priceRange.min` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `facets.priceRange.max` | string | sim | padrão `^\d+(\.\d{1,18})?$` |

#### `GET /nfts/featured`

Slides do hero e NFT em destaque da home.

- **Acesso:** pública

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `hero` | object[] | sim |  |
| `hero[].id` | string | sim | mín. 1 car. |
| `hero[].eyebrow` | string | sim |  |
| `hero[].title` | string | sim |  |
| `hero[].description` | string | sim |  |
| `hero[].ctaLabel` | string | sim |  |
| `hero[].images` | object[] | sim |  |
| `hero[].images[].key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `hero[].images[].alt` | string | sim | mín. 1 car. |
| `hero[].nftId` | string | sim | mín. 1 car. |
| `spotlight` | object | sim |  |
| `spotlight.id` | string | sim | mín. 1 car. |
| `spotlight.tokenId` | string | sim |  |
| `spotlight.name` | string | sim |  |
| `spotlight.image` | object | sim |  |
| `spotlight.image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `spotlight.image.alt` | string | sim | mín. 1 car. |
| `spotlight.price` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `spotlight.compareAtPrice` | string \| null | sim |  |
| `spotlight.rare` | boolean | sim |  |
| `spotlight.collection` | object | sim |  |
| `spotlight.collection.id` | string | sim | mín. 1 car. |
| `spotlight.collection.name` | string | sim |  |
| `spotlight.network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `spotlight.available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `spotlight.version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `spotlight.createdAt` | string (date-time) | sim |  |

#### `GET /nfts/:nftId`

Detalhe do NFT. 404 NOT_FOUND se não existir.

- **Acesso:** pública

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `tokenId` | string | sim |  |
| `name` | string | sim |  |
| `image` | object | sim |  |
| `image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `image.alt` | string | sim | mín. 1 car. |
| `price` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `compareAtPrice` | string \| null | sim |  |
| `rare` | boolean | sim |  |
| `collection` | object | sim |  |
| `collection.id` | string | sim | mín. 1 car. |
| `collection.name` | string | sim |  |
| `network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `createdAt` | string (date-time) | sim |  |
| `description` | string | sim |  |
| `about` | string[] | sim |  |
| `editions` | object[] | sim |  |
| `editions[].id` | string | sim | mín. 1 car. |
| `editions[].label` | string | sim |  |
| `editions[].supply` | integer \| null | sim |  |
| `editions[].available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `editions[].price` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `editions[].compareAtPrice` | string \| null | sim |  |
| `defaultEditionId` | string | sim | mín. 1 car. |
| `attributes` | string[] | sim |  |
| `gallery` | object[] | sim |  |
| `gallery[].key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `gallery[].alt` | string | sim | mín. 1 car. |
| `rating` | object | sim |  |
| `rating.average` | number | sim | mín. 0, máx. 5 |
| `rating.count` | integer | sim | mín. 0, máx. 9007199254740991 |
| `contract` | object | sim |  |
| `contract.address` | string | sim |  |
| `contract.standard` | string | sim |  |
| `contract.royaltyPercent` | number | sim | mín. 0, máx. 100 |
| `maxPerOrder` | integer | sim | máx. 9007199254740991 |
| `series` | string | não |  |

#### `GET /nfts/:nftId/related`

'Mais desta coleção' / 'Colecionadores também viram'.

- **Acesso:** pública

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `items` | object[] | sim |  |
| `items[].id` | string | sim | mín. 1 car. |
| `items[].tokenId` | string | sim |  |
| `items[].name` | string | sim |  |
| `items[].image` | object | sim |  |
| `items[].image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `items[].image.alt` | string | sim | mín. 1 car. |
| `items[].price` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].compareAtPrice` | string \| null | sim |  |
| `items[].rare` | boolean | sim |  |
| `items[].collection` | object | sim |  |
| `items[].collection.id` | string | sim | mín. 1 car. |
| `items[].collection.name` | string | sim |  |
| `items[].network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `items[].available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].createdAt` | string (date-time) | sim |  |

#### `GET /nfts/:nftId/reviews`

Avaliações dos colecionadores (aba do detalhe).

- **Acesso:** pública

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `items` | object[] | sim |  |
| `items[].id` | string | sim | mín. 1 car. |
| `items[].author` | string | sim |  |
| `items[].rating` | integer | sim | mín. 1, máx. 5 |
| `items[].comment` | string | sim |  |
| `items[].createdAt` | string (date-time) | sim |  |
| `average` | number | sim |  |
| `count` | integer | sim | mín. 0, máx. 9007199254740991 |

### Favoritos

#### `GET /favorites`

Favoritos do usuário (isolados por usuário).

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `items` | object[] | sim |  |
| `items[].id` | string | sim | mín. 1 car. |
| `items[].tokenId` | string | sim |  |
| `items[].name` | string | sim |  |
| `items[].image` | object | sim |  |
| `items[].image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `items[].image.alt` | string | sim | mín. 1 car. |
| `items[].price` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].compareAtPrice` | string \| null | sim |  |
| `items[].rare` | boolean | sim |  |
| `items[].collection` | object | sim |  |
| `items[].collection.id` | string | sim | mín. 1 car. |
| `items[].collection.name` | string | sim |  |
| `items[].network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `items[].available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].createdAt` | string (date-time) | sim |  |

#### `PUT /favorites/:nftId`

Favorita (idempotente). 404 se o NFT não existir.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `nftId` | string | sim | mín. 1 car. |
| `favorited` | boolean | sim |  |

#### `DELETE /favorites/:nftId`

Remove o favorito (idempotente).

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `nftId` | string | sim | mín. 1 car. |
| `favorited` | boolean | sim |  |

### Carrinho

#### `GET /cart`

Carrinho do usuário (token) ou do visitante (X-Cart-Id). Sempre existe (vazio se novo).

- **Acesso:** aceita visitante (X-Cart-Id)

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `items` | object[] | sim |  |
| `items[].id` | string | sim | mín. 1 car. |
| `items[].nftId` | string | sim | mín. 1 car. |
| `items[].editionId` | string | sim | mín. 1 car. |
| `items[].quantity` | integer | sim | mín. 1, máx. 9007199254740991 |
| `items[].name` | string | sim |  |
| `items[].tokenId` | string | sim |  |
| `items[].editionLabel` | string | sim |  |
| `items[].image` | object | sim |  |
| `items[].image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `items[].image.alt` | string | sim | mín. 1 car. |
| `items[].unitPrice` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].lineTotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].maxQuantity` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].status` | `ok` \| `price-changed` \| `limited` \| `unavailable` | sim |  |
| `items[].priceChangedFrom` | string \| null | sim |  |
| `items[].nftVersion` | integer | sim | mín. 0, máx. 9007199254740991 |
| `totalQuantity` | integer | sim | mín. 0, máx. 9007199254740991 |
| `version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `updatedAt` | string (date-time) | sim |  |

#### `POST /cart/items`

Adiciona (ou soma quantidade). 409 AVAILABILITY_CONFLICT se exceder estoque/limite; 404 se NFT/edição não existir.

- **Acesso:** aceita visitante (X-Cart-Id)

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `nftId` | string | sim | mín. 1 car. |
| `editionId` | string | sim | mín. 1 car. |
| `quantity` | integer | sim | mín. 1, máx. 99 |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `items` | object[] | sim |  |
| `items[].id` | string | sim | mín. 1 car. |
| `items[].nftId` | string | sim | mín. 1 car. |
| `items[].editionId` | string | sim | mín. 1 car. |
| `items[].quantity` | integer | sim | mín. 1, máx. 9007199254740991 |
| `items[].name` | string | sim |  |
| `items[].tokenId` | string | sim |  |
| `items[].editionLabel` | string | sim |  |
| `items[].image` | object | sim |  |
| `items[].image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `items[].image.alt` | string | sim | mín. 1 car. |
| `items[].unitPrice` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].lineTotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].maxQuantity` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].status` | `ok` \| `price-changed` \| `limited` \| `unavailable` | sim |  |
| `items[].priceChangedFrom` | string \| null | sim |  |
| `items[].nftVersion` | integer | sim | mín. 0, máx. 9007199254740991 |
| `totalQuantity` | integer | sim | mín. 0, máx. 9007199254740991 |
| `version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `updatedAt` | string (date-time) | sim |  |

#### `PATCH /cart/items/:itemId`

Altera a quantidade (respeita estoque/limite: 409 AVAILABILITY_CONFLICT).

- **Acesso:** aceita visitante (X-Cart-Id)

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `quantity` | integer | sim | mín. 1, máx. 99 |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `items` | object[] | sim |  |
| `items[].id` | string | sim | mín. 1 car. |
| `items[].nftId` | string | sim | mín. 1 car. |
| `items[].editionId` | string | sim | mín. 1 car. |
| `items[].quantity` | integer | sim | mín. 1, máx. 9007199254740991 |
| `items[].name` | string | sim |  |
| `items[].tokenId` | string | sim |  |
| `items[].editionLabel` | string | sim |  |
| `items[].image` | object | sim |  |
| `items[].image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `items[].image.alt` | string | sim | mín. 1 car. |
| `items[].unitPrice` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].lineTotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].maxQuantity` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].status` | `ok` \| `price-changed` \| `limited` \| `unavailable` | sim |  |
| `items[].priceChangedFrom` | string \| null | sim |  |
| `items[].nftVersion` | integer | sim | mín. 0, máx. 9007199254740991 |
| `totalQuantity` | integer | sim | mín. 0, máx. 9007199254740991 |
| `version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `updatedAt` | string (date-time) | sim |  |

#### `DELETE /cart/items/:itemId`

Remove o item.

- **Acesso:** aceita visitante (X-Cart-Id)

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `items` | object[] | sim |  |
| `items[].id` | string | sim | mín. 1 car. |
| `items[].nftId` | string | sim | mín. 1 car. |
| `items[].editionId` | string | sim | mín. 1 car. |
| `items[].quantity` | integer | sim | mín. 1, máx. 9007199254740991 |
| `items[].name` | string | sim |  |
| `items[].tokenId` | string | sim |  |
| `items[].editionLabel` | string | sim |  |
| `items[].image` | object | sim |  |
| `items[].image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `items[].image.alt` | string | sim | mín. 1 car. |
| `items[].unitPrice` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].lineTotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].maxQuantity` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].status` | `ok` \| `price-changed` \| `limited` \| `unavailable` | sim |  |
| `items[].priceChangedFrom` | string \| null | sim |  |
| `items[].nftVersion` | integer | sim | mín. 0, máx. 9007199254740991 |
| `totalQuantity` | integer | sim | mín. 0, máx. 9007199254740991 |
| `version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `updatedAt` | string (date-time) | sim |  |

#### `POST /cart/merge`

Mescla o carrinho do visitante no do usuário após autenticar.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `guestCartId` | string | sim | mín. 1 car. |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `cart` | object | sim |  |
| `cart.id` | string | sim | mín. 1 car. |
| `cart.items` | object[] | sim |  |
| `cart.items[].id` | string | sim | mín. 1 car. |
| `cart.items[].nftId` | string | sim | mín. 1 car. |
| `cart.items[].editionId` | string | sim | mín. 1 car. |
| `cart.items[].quantity` | integer | sim | mín. 1, máx. 9007199254740991 |
| `cart.items[].name` | string | sim |  |
| `cart.items[].tokenId` | string | sim |  |
| `cart.items[].editionLabel` | string | sim |  |
| `cart.items[].image` | object | sim |  |
| `cart.items[].unitPrice` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `cart.items[].lineTotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `cart.items[].available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `cart.items[].maxQuantity` | integer | sim | mín. 0, máx. 9007199254740991 |
| `cart.items[].status` | `ok` \| `price-changed` \| `limited` \| `unavailable` | sim |  |
| `cart.items[].priceChangedFrom` | string \| null | sim |  |
| `cart.items[].nftVersion` | integer | sim | mín. 0, máx. 9007199254740991 |
| `cart.totalQuantity` | integer | sim | mín. 0, máx. 9007199254740991 |
| `cart.version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `cart.updatedAt` | string (date-time) | sim |  |
| `adjustments` | object[] | sim |  |
| `adjustments[].itemId` | string | sim | mín. 1 car. |
| `adjustments[].code` | `LIMITED` \| `UNAVAILABLE` | sim |  |
| `adjustments[].message` | string | sim |  |

### Cotação

#### `POST /quotes`

Cotação do carrinho atual (+cupom, +rede): subtotal, desconto, taxa, total. 422 COUPON_INVALID / COUPON_EXPIRED.

- **Acesso:** aceita visitante (X-Cart-Id)

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `couponCode` | string \| null | não |  |
| `network` | `ethereum` \| `polygon` \| `solana` | não |  |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `revision` | string | sim |  |
| `createdAt` | string (date-time) | sim |  |
| `expiresAt` | string (date-time) | sim |  |
| `lines` | object[] | sim |  |
| `lines[].itemId` | string | sim | mín. 1 car. |
| `lines[].nftId` | string | sim | mín. 1 car. |
| `lines[].editionId` | string | sim | mín. 1 car. |
| `lines[].name` | string | sim |  |
| `lines[].tokenId` | string | sim |  |
| `lines[].editionLabel` | string | sim |  |
| `lines[].image` | object | sim |  |
| `lines[].image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `lines[].image.alt` | string | sim | mín. 1 car. |
| `lines[].quantity` | integer | sim | mín. 1, máx. 9007199254740991 |
| `lines[].unitPrice` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `lines[].lineTotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `lines[].available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `lines[].status` | `ok` \| `price-changed` \| `limited` \| `unavailable` | sim |  |
| `subtotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `discount` | object | sim |  |
| `discount.label` | string | sim |  |
| `discount.amount` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `discount.couponCode` | string \| null | sim |  |
| `networkFee` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `feeEstimated` | boolean | sim |  |
| `total` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `warnings` | object[] | sim |  |
| `warnings[].code` | `PRICE_CHANGED` \| `LIMITED` \| `UNAVAILABLE` \| `COUPON_REMOVED` | sim |  |
| `warnings[].message` | string | sim |  |
| `warnings[].nftId` | string \| null | sim |  |
| `purchasable` | boolean | sim |  |

### Carteiras

#### `GET /wallets`

Carteiras do usuário (principal e secundária).

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `items` | object[] | sim |  |
| `items[].role` | `primary` \| `secondary` | sim |  |
| `items[].displayName` | string | sim | mín. 2 car., máx. 40 car. |
| `items[].nickname` | string | sim | mín. 2 car., máx. 24 car. |
| `items[].network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `items[].profileName` | string | sim | mín. 2 car., máx. 40 car. |
| `items[].address` | string | sim | mín. 1 car. |
| `items[].secondaryRef` | string \| null | não |  |
| `items[].walletType` | `metamask` \| `walletconnect` \| `coinbase` | sim |  |
| `items[].referralCode` | string | sim | mín. 4 car., máx. 24 car. |
| `items[].email` | string (email) | sim |  |
| `items[].ensName` | string | sim | mín. 3 car., máx. 60 car. |
| `items[].id` | string | sim | mín. 1 car. |
| `items[].createdAt` | string (date-time) | sim |  |
| `items[].updatedAt` | string (date-time) | sim |  |

#### `POST /wallets`

Cadastra carteira. 409 CONFLICT se já existir uma com a mesma função/endereço; 422 com fieldErrors.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `role` | `primary` \| `secondary` | sim |  |
| `displayName` | string | sim | mín. 2 car., máx. 40 car. |
| `nickname` | string | sim | mín. 2 car., máx. 24 car. |
| `network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `profileName` | string | sim | mín. 2 car., máx. 40 car. |
| `address` | string | sim | mín. 1 car. |
| `secondaryRef` | string \| null | não |  |
| `walletType` | `metamask` \| `walletconnect` \| `coinbase` | sim |  |
| `referralCode` | string | sim | mín. 4 car., máx. 24 car. |
| `email` | string (email) | sim |  |
| `ensName` | string | sim | mín. 3 car., máx. 60 car. |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `role` | `primary` \| `secondary` | sim |  |
| `displayName` | string | sim | mín. 2 car., máx. 40 car. |
| `nickname` | string | sim | mín. 2 car., máx. 24 car. |
| `network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `profileName` | string | sim | mín. 2 car., máx. 40 car. |
| `address` | string | sim | mín. 1 car. |
| `secondaryRef` | string \| null | não |  |
| `walletType` | `metamask` \| `walletconnect` \| `coinbase` | sim |  |
| `referralCode` | string | sim | mín. 4 car., máx. 24 car. |
| `email` | string (email) | sim |  |
| `ensName` | string | sim | mín. 3 car., máx. 60 car. |
| `id` | string | sim | mín. 1 car. |
| `createdAt` | string (date-time) | sim |  |
| `updatedAt` | string (date-time) | sim |  |

#### `PUT /wallets/:walletId`

Atualiza carteira. 404 se não for do usuário.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `role` | `primary` \| `secondary` | sim |  |
| `displayName` | string | sim | mín. 2 car., máx. 40 car. |
| `nickname` | string | sim | mín. 2 car., máx. 24 car. |
| `network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `profileName` | string | sim | mín. 2 car., máx. 40 car. |
| `address` | string | sim | mín. 1 car. |
| `secondaryRef` | string \| null | não |  |
| `walletType` | `metamask` \| `walletconnect` \| `coinbase` | sim |  |
| `referralCode` | string | sim | mín. 4 car., máx. 24 car. |
| `email` | string (email) | sim |  |
| `ensName` | string | sim | mín. 3 car., máx. 60 car. |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `role` | `primary` \| `secondary` | sim |  |
| `displayName` | string | sim | mín. 2 car., máx. 40 car. |
| `nickname` | string | sim | mín. 2 car., máx. 24 car. |
| `network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `profileName` | string | sim | mín. 2 car., máx. 40 car. |
| `address` | string | sim | mín. 1 car. |
| `secondaryRef` | string \| null | não |  |
| `walletType` | `metamask` \| `walletconnect` \| `coinbase` | sim |  |
| `referralCode` | string | sim | mín. 4 car., máx. 24 car. |
| `email` | string (email) | sim |  |
| `ensName` | string | sim | mín. 3 car., máx. 60 car. |
| `id` | string | sim | mín. 1 car. |
| `createdAt` | string (date-time) | sim |  |
| `updatedAt` | string (date-time) | sim |  |

#### `POST /wallets/connect`

Simula a conexão do provedor. 422 WALLET_REJECTED quando o usuário 'recusa'.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `provider` | `metamask` \| `walletconnect` \| `coinbase` | sim |  |
| `network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `walletId` | string | não | mín. 1 car. |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `connected` | `true` | sim |  |
| `provider` | `metamask` \| `walletconnect` \| `coinbase` | sim |  |
| `network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `address` | string | sim |  |
| `sessionId` | string | sim |  |

#### `POST /wallets/disconnect`

Simula a desconexão (204).

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

_sem corpo (204)_

### Pedidos

#### `POST /orders`

Cria o pedido (header Idempotency-Key obrigatório). 202 pending | 200 replay idempotente. Revalida preço/estoque/cupom/taxa: 409 QUOTE_CHANGED (meta.quote) | AVAILABILITY_CONFLICT (meta.items) | IDEMPOTENCY_KEY_REUSED.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `quoteId` | string | sim | mín. 1 car. |
| `quoteRevision` | string | sim |  |
| `walletId` | string | sim | mín. 1 car. |
| `provider` | `metamask` \| `walletconnect` \| `coinbase` | sim |  |
| `network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `collector` | object | sim |  |
| `collector.displayName` | string | sim | mín. 2 car., máx. 40 car. |
| `collector.username` | string | sim | mín. 3 car., máx. 24 car. |
| `collector.profileName` | string | sim | mín. 2 car., máx. 40 car. |
| `collector.email` | string (email) | sim |  |
| `collector.ensName` | string | sim | mín. 3 car., máx. 60 car. |
| `collector.referralCode` | string | sim | mín. 4 car., máx. 24 car. |
| `collector.note` | string | não | máx. 280 car. |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `status` | `pending` \| `confirmed` \| `declined` | sim |  |
| `version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `createdAt` | string (date-time) | sim |  |
| `updatedAt` | string (date-time) | sim |  |
| `lines` | object[] | sim |  |
| `lines[].nftId` | string | sim | mín. 1 car. |
| `lines[].editionId` | string | sim | mín. 1 car. |
| `lines[].name` | string | sim |  |
| `lines[].tokenId` | string | sim |  |
| `lines[].editionLabel` | string | sim |  |
| `lines[].image` | object | sim |  |
| `lines[].image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `lines[].image.alt` | string | sim | mín. 1 car. |
| `lines[].quantity` | integer | sim | mín. 1, máx. 9007199254740991 |
| `lines[].unitPrice` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `lines[].lineTotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `subtotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `discount` | object | sim |  |
| `discount.label` | string | sim |  |
| `discount.amount` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `discount.couponCode` | string \| null | sim |  |
| `networkFee` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `total` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `wallet` | object | sim |  |
| `wallet.id` | string | sim | mín. 1 car. |
| `wallet.nickname` | string | sim |  |
| `wallet.address` | string | sim |  |
| `wallet.provider` | `metamask` \| `walletconnect` \| `coinbase` | sim |  |
| `wallet.network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `txHash` | string \| null | sim |  |
| `explorerUrl` | string \| null | sim |  |
| `decline` | object \| null | sim |  |
| `decline.code` | string | sim |  |
| `decline.message` | string | sim |  |
| `quoteId` | string | sim | mín. 1 car. |
| `quoteRevision` | string | sim |  |

#### `GET /orders/:orderId`

Estado e recibo do pedido. 404 se não for do usuário.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `status` | `pending` \| `confirmed` \| `declined` | sim |  |
| `version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `createdAt` | string (date-time) | sim |  |
| `updatedAt` | string (date-time) | sim |  |
| `lines` | object[] | sim |  |
| `lines[].nftId` | string | sim | mín. 1 car. |
| `lines[].editionId` | string | sim | mín. 1 car. |
| `lines[].name` | string | sim |  |
| `lines[].tokenId` | string | sim |  |
| `lines[].editionLabel` | string | sim |  |
| `lines[].image` | object | sim |  |
| `lines[].image.key` | `golden` \| `emerald` \| `sage` \| `ivory` | sim |  |
| `lines[].image.alt` | string | sim | mín. 1 car. |
| `lines[].quantity` | integer | sim | mín. 1, máx. 9007199254740991 |
| `lines[].unitPrice` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `lines[].lineTotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `subtotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `discount` | object | sim |  |
| `discount.label` | string | sim |  |
| `discount.amount` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `discount.couponCode` | string \| null | sim |  |
| `networkFee` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `total` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `wallet` | object | sim |  |
| `wallet.id` | string | sim | mín. 1 car. |
| `wallet.nickname` | string | sim |  |
| `wallet.address` | string | sim |  |
| `wallet.provider` | `metamask` \| `walletconnect` \| `coinbase` | sim |  |
| `wallet.network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `txHash` | string \| null | sim |  |
| `explorerUrl` | string \| null | sim |  |
| `decline` | object \| null | sim |  |
| `decline.code` | string | sim |  |
| `decline.message` | string | sim |  |
| `quoteId` | string | sim | mín. 1 car. |
| `quoteRevision` | string | sim |  |

#### `GET /orders`

Pedidos do usuário (recuperar pendentes após refresh).

- **Acesso:** **exige autenticação**

**Query**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `status` | `pending` \| `confirmed` \| `declined` | não |  |

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `items` | object[] | sim |  |
| `items[].id` | string | sim | mín. 1 car. |
| `items[].status` | `pending` \| `confirmed` \| `declined` | sim |  |
| `items[].version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `items[].createdAt` | string (date-time) | sim |  |
| `items[].updatedAt` | string (date-time) | sim |  |
| `items[].lines` | object[] | sim |  |
| `items[].lines[].nftId` | string | sim | mín. 1 car. |
| `items[].lines[].editionId` | string | sim | mín. 1 car. |
| `items[].lines[].name` | string | sim |  |
| `items[].lines[].tokenId` | string | sim |  |
| `items[].lines[].editionLabel` | string | sim |  |
| `items[].lines[].image` | object | sim |  |
| `items[].lines[].quantity` | integer | sim | mín. 1, máx. 9007199254740991 |
| `items[].lines[].unitPrice` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].lines[].lineTotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].subtotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].discount` | object | sim |  |
| `items[].discount.label` | string | sim |  |
| `items[].discount.amount` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].discount.couponCode` | string \| null | sim |  |
| `items[].networkFee` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].total` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `items[].wallet` | object | sim |  |
| `items[].wallet.id` | string | sim | mín. 1 car. |
| `items[].wallet.nickname` | string | sim |  |
| `items[].wallet.address` | string | sim |  |
| `items[].wallet.provider` | `metamask` \| `walletconnect` \| `coinbase` | sim |  |
| `items[].wallet.network` | `ethereum` \| `polygon` \| `solana` | sim |  |
| `items[].txHash` | string \| null | sim |  |
| `items[].explorerUrl` | string \| null | sim |  |
| `items[].decline` | object \| null | sim |  |
| `items[].decline.code` | string | sim |  |
| `items[].decline.message` | string | sim |  |
| `items[].quoteId` | string | sim | mín. 1 car. |
| `items[].quoteRevision` | string | sim |  |

### Perfil

#### `GET /profile`

Perfil do colecionador.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `username` | string | sim |  |
| `displayName` | string | sim |  |
| `email` | string (email) | sim |  |
| `avatarUrl` | string \| null | sim |  |
| `ensName` | string \| null | sim |  |
| `walletNickname` | string \| null | sim |  |
| `createdAt` | string (date-time) | sim |  |

#### `PATCH /profile`

Atualiza dados. 409 EMAIL_TAKEN / USERNAME_TAKEN; 422 com fieldErrors.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `displayName` | string | sim | mín. 2 car., máx. 40 car. |
| `username` | string | sim | padrão `^[a-z0-9_.]+$`, mín. 3 car., máx. 24 car. |
| `email` | string (email) | sim |  |
| `ensName` | string | sim | mín. 3 car., máx. 60 car. |
| `walletNickname` | string | sim | mín. 2 car., máx. 24 car. |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `username` | string | sim |  |
| `displayName` | string | sim |  |
| `email` | string (email) | sim |  |
| `avatarUrl` | string \| null | sim |  |
| `ensName` | string \| null | sim |  |
| `walletNickname` | string \| null | sim |  |
| `createdAt` | string (date-time) | sim |  |

#### `PUT /profile/avatar`

Define o avatar (data URL).

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `dataUrl` | string | sim | padrão `^data:image\/(png\|jpeg\|webp);base64,`, máx. 600000 car. |

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `username` | string | sim |  |
| `displayName` | string | sim |  |
| `email` | string (email) | sim |  |
| `avatarUrl` | string \| null | sim |  |
| `ensName` | string \| null | sim |  |
| `walletNickname` | string \| null | sim |  |
| `createdAt` | string (date-time) | sim |  |

#### `DELETE /profile/avatar`

Remove o avatar.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

_nenhum_

**Resposta**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string | sim | mín. 1 car. |
| `username` | string | sim |  |
| `displayName` | string | sim |  |
| `email` | string (email) | sim |  |
| `avatarUrl` | string \| null | sim |  |
| `ensName` | string \| null | sim |  |
| `walletNickname` | string \| null | sim |  |
| `createdAt` | string (date-time) | sim |  |

#### `PUT /profile/password`

Altera a senha (204). 422 fieldErrors.currentPassword se a atual estiver incorreta.

- **Acesso:** **exige autenticação**

**Query**

_nenhum_

**Corpo da requisição**

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `currentPassword` | string | sim | mín. 1 car. |
| `newPassword` | string | sim | mín. 8 car. |

**Resposta**

_sem corpo (204)_


## Eventos Socket.IO

- **Transporte:** somente `websocket` (sem long-polling), namespace padrão, eventos de texto — limitações do `@mswjs/socket.io-binding`. **Sem acks, sem binário, sem rooms.** Detalhes em [MOCKS.md](./MOCKS.md).
- **Conexão:** `io(origin, { ...SOCKET_CLIENT_OPTIONS, auth: { token } })` com `path: "/socket.io/"`; opções: `{"path":"/socket.io/","transports":["websocket"],"reconnection":true,"reconnectionDelay":500,"reconnectionDelayMax":4000}`.
- **Eventos:** `nft.updated`, `order.updated`. Cada evento é emitido com o nome do `type` e **um** argumento: o envelope abaixo.
- **Envelope:** `id` (UUID estável → deduplicação), `resource` + `version` (monotônica → descarte de eventos antigos), `occurredAt`, `userScope?` (só vale para esse usuário).
- **Cliente:** ignora duplicatas (mesmo `id`) e versões menores ou iguais à conhecida; após reconectar, reconcilia com o REST. Ver [CACHE.md](./CACHE.md).

### `nft.updated` — preço e disponibilidade

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string (uuid) | sim |  |
| `version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `occurredAt` | string (date-time) | sim |  |
| `userScope` | string | não | mín. 1 car. |
| `type` | `nft.updated` | sim |  |
| `resource` | object | sim |  |
| `resource.kind` | `nft` | sim |  |
| `resource.id` | string | sim | mín. 1 car. |
| `payload` | object | sim |  |
| `payload.nftId` | string | sim | mín. 1 car. |
| `payload.price` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `payload.compareAtPrice` | string \| null | sim |  |
| `payload.available` | integer | sim | mín. 0, máx. 9007199254740991 |
| `payload.editions` | object[] | sim |  |
| `payload.editions[].id` | string | sim | mín. 1 car. |
| `payload.editions[].price` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `payload.editions[].compareAtPrice` | string \| null | sim |  |
| `payload.editions[].available` | integer | sim | mín. 0, máx. 9007199254740991 |

### `order.updated` — estado do pedido (somente para o dono; `userScope` = id do usuário)

| Campo | Tipo | Obrig. | Regras |
| --- | --- | :-: | --- |
| `id` | string (uuid) | sim |  |
| `version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `occurredAt` | string (date-time) | sim |  |
| `userScope` | string | não | mín. 1 car. |
| `type` | `order.updated` | sim |  |
| `resource` | object | sim |  |
| `resource.kind` | `order` | sim |  |
| `resource.id` | string | sim | mín. 1 car. |
| `payload` | object | sim |  |
| `payload.order` | object | sim |  |
| `payload.order.id` | string | sim | mín. 1 car. |
| `payload.order.status` | `pending` \| `confirmed` \| `declined` | sim |  |
| `payload.order.version` | integer | sim | mín. 0, máx. 9007199254740991 |
| `payload.order.createdAt` | string (date-time) | sim |  |
| `payload.order.updatedAt` | string (date-time) | sim |  |
| `payload.order.lines` | object[] | sim |  |
| `payload.order.subtotal` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `payload.order.discount` | object | sim |  |
| `payload.order.networkFee` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `payload.order.total` | string | sim | padrão `^\d+(\.\d{1,18})?$` |
| `payload.order.wallet` | object | sim |  |
| `payload.order.txHash` | string \| null | sim |  |
| `payload.order.explorerUrl` | string \| null | sim |  |
| `payload.order.decline` | object \| null | sim |  |
| `payload.order.quoteId` | string | sim | mín. 1 car. |
| `payload.order.quoteRevision` | string | sim |  |
