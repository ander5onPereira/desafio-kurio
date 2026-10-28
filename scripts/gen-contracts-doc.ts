/**
 * Gera docs/CONTRACTS.md a partir do registro de endpoints (src/contracts/endpoints.ts) e dos
 * schemas Zod. A documentação nunca diverge do código: ela É derivada dele.
 *
 * Uso: npx tsx scripts/gen-contracts-doc.ts
 */
import { writeFile } from "node:fs/promises";
import { z } from "zod";
import {
  CLIENT_ERROR_CODES,
  endpoints,
  IDEMPOTENCY_HEADER,
  IDEMPOTENT_REPLAY_HEADER,
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  SERVER_ERROR_CODES,
  SOCKET_CLIENT_OPTIONS,
  SOCKET_EVENT_TYPES,
  SOCKET_PATH,
  type Endpoint,
} from "../src/contracts";

type JsonSchema = {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  enum?: unknown[];
  const?: unknown;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  description?: string;
};

const MAX_DEPTH = 3;

function typeOf(schema: JsonSchema): string {
  if (schema.enum) return schema.enum.map((value) => `\`${String(value)}\``).join(" \\| ");
  if (schema.const !== undefined) return `\`${String(schema.const)}\``;
  const variants = schema.anyOf ?? schema.oneOf;
  if (variants) return [...new Set(variants.map(typeOf))].join(" \\| ");
  if (schema.type === "array") return `${schema.items ? typeOf(schema.items) : "any"}[]`;
  const base = Array.isArray(schema.type) ? schema.type.join(" \\| ") : (schema.type ?? "any");
  return schema.format ? `${base} (${schema.format})` : base;
}

function notes(schema: JsonSchema): string {
  const parts: string[] = [];
  // Formatos conhecidos (e-mail, data/hora) já aparecem no tipo; o regex só atrapalha a leitura.
  if (schema.pattern && !schema.format) parts.push(`padrão \`${schema.pattern.replaceAll("|", "\\|")}\``);
  if (schema.minimum !== undefined) parts.push(`mín. ${schema.minimum}`);
  if (schema.maximum !== undefined) parts.push(`máx. ${schema.maximum}`);
  if (schema.minLength !== undefined) parts.push(`mín. ${schema.minLength} car.`);
  if (schema.maxLength !== undefined) parts.push(`máx. ${schema.maxLength} car.`);
  return parts.join(", ");
}

function rows(schema: JsonSchema, prefix: string, required: boolean, depth: number, out: string[]) {
  const variants = (schema.anyOf ?? schema.oneOf)?.filter((variant) => variant.type !== "null");
  const objectLike = schema.type === "object" ? schema : variants?.find((variant) => variant.type === "object");
  const arrayOfObjects = schema.type === "array" && schema.items?.type === "object" ? schema.items : undefined;

  if (prefix) out.push(`| \`${prefix}\` | ${typeOf(schema)} | ${required ? "sim" : "não"} | ${notes(schema)} |`);

  const target = objectLike ?? arrayOfObjects;
  if (!target?.properties || depth >= MAX_DEPTH) return;
  const childPrefix = arrayOfObjects ? `${prefix}[]` : prefix;
  for (const [name, child] of Object.entries(target.properties)) {
    rows(child, childPrefix ? `${childPrefix}.${name}` : name, target.required?.includes(name) ?? false, depth + 1, out);
  }
}

function table(schema: z.ZodType | undefined, io: "input" | "output"): string {
  if (!schema) return "_nenhum_";
  let json: JsonSchema;
  try {
    json = z.toJSONSchema(schema, { io, unrepresentable: "any" }) as JsonSchema;
  } catch {
    return "_(schema não representável em tabela)_";
  }
  const out: string[] = [];
  rows(json, "", true, 0, out);
  if (json.type === undefined && !json.properties && !json.anyOf) return "_sem corpo (204)_";
  if (out.length === 0 && json.type === "object" && json.properties) {
    for (const [name, child] of Object.entries(json.properties)) {
      rows(child, name, json.required?.includes(name) ?? false, 1, out);
    }
  }
  return out.length ? `| Campo | Tipo | Obrig. | Regras |\n| --- | --- | :-: | --- |\n${out.join("\n")}` : "_sem campos_";
}

function endpointDoc(endpoint: Endpoint): string {
  const authText = { public: "pública", optional: "aceita visitante (X-Cart-Id)", required: "**exige autenticação**" }[endpoint.auth];
  return `#### \`${endpoint.method.toUpperCase()} ${endpoint.path}\`

${endpoint.description}

- **Acesso:** ${authText}

**Query**

${table(endpoint.query, "input")}

**Corpo da requisição**

${table(endpoint.body, "input")}

**Resposta**

${table(endpoint.response, "output")}
`;
}

const GROUP_TITLES: Record<string, string> = {
  auth: "Sessão e conta",
  nfts: "NFTs",
  favorites: "Favoritos",
  cart: "Carrinho",
  quotes: "Cotação",
  wallets: "Carteiras",
  orders: "Pedidos",
  profile: "Perfil",
};

const HTTP_STATUS: Record<string, string> = {
  VALIDATION_ERROR: "400 / 422",
  UNAUTHENTICATED: "401",
  SESSION_EXPIRED: "401",
  FORBIDDEN: "403",
  NOT_FOUND: "404",
  CONFLICT: "409",
  EMAIL_TAKEN: "409",
  USERNAME_TAKEN: "409",
  AVAILABILITY_CONFLICT: "409",
  QUOTE_CHANGED: "409",
  IDEMPOTENCY_KEY_REUSED: "409",
  COUPON_INVALID: "422",
  COUPON_EXPIRED: "422",
  WALLET_REJECTED: "422",
  RATE_LIMITED: "429",
  TRANSIENT: "500 / 502 / 503 / 504",
  INTERNAL: "500",
};

const ERROR_MEANING: Record<string, string> = {
  VALIDATION_ERROR: "Campos inválidos; vem com `fieldErrors`.",
  UNAUTHENTICATED: "Sem credenciais válidas.",
  SESSION_EXPIRED: "Token vencido: o cliente tenta UM refresh e repete a chamada.",
  FORBIDDEN: "Sem permissão para o recurso.",
  NOT_FOUND: "Recurso inexistente (ou de outro usuário).",
  CONFLICT: "Conflito genérico de estado.",
  EMAIL_TAKEN: "E-mail já cadastrado (`fieldErrors.email`).",
  USERNAME_TAKEN: "Nome de usuário já existe (`fieldErrors.username`).",
  AVAILABILITY_CONFLICT: "Estoque/limite insuficiente; `meta.items` lista o que faltou.",
  QUOTE_CHANGED: "Cotação mudou (preço, estoque, cupom ou taxa); `meta.quote` traz a nova — exige nova confirmação.",
  IDEMPOTENCY_KEY_REUSED: "Mesma `Idempotency-Key` com corpo diferente.",
  COUPON_INVALID: "Cupom inexistente.",
  COUPON_EXPIRED: "Cupom vencido.",
  WALLET_REJECTED: "Conexão da carteira recusada pelo usuário (simulação).",
  RATE_LIMITED: "Muitas requisições; vale tentar de novo.",
  TRANSIENT: "Falha transitória do servidor; vale tentar de novo.",
  INTERNAL: "Erro interno.",
};

const sections = Object.entries(endpoints).map(
  ([group, items]) =>
    `### ${GROUP_TITLES[group] ?? group}\n\n${Object.values(items as Record<string, Endpoint>).map(endpointDoc).join("\n")}`,
);

const errorRows = SERVER_ERROR_CODES.map((code) => `| \`${code}\` | ${HTTP_STATUS[code] ?? "—"} | ${ERROR_MEANING[code] ?? ""} |`);

const doc = `# Contratos — REST e eventos Socket.IO

> **Gerado automaticamente** por \`npx tsx scripts/gen-contracts-doc.ts\` a partir de
> \`src/contracts/\` (registro de endpoints + schemas Zod). Não edite à mão: mude o contrato e gere de novo.
> O MESMO registro alimenta o cliente (Axios, \`callEndpoint\`) e os handlers do MSW.

## Convenções

- **Base:** \`/api\` (\`VITE_API_URL\`). O MSW intercepta no navegador; não existe backend real.
- **Dinheiro:** ETH sempre **string decimal** (até 18 casas), nunca número: \`"1.19"\`, \`"26.846"\`. Quantidades são inteiros.
- **Erros:** toda resposta de erro segue \`{ code, message, fieldErrors?, meta? }\` (tabela abaixo). A UI decide pelo \`code\`, nunca pelo status HTTP.
- **Paginação:** \`{ page, pageSize, total, totalPages }\`; parâmetros da listagem = os mesmos nomes dos search params da URL.
- **Arrays em query:** parâmetros repetidos (\`?collection=a&collection=b\`).

## Cabeçalhos

| Cabeçalho | Onde | Descrição |
| --- | --- | --- |
| \`Authorization: Bearer <accessToken>\` | Rotas privadas | Token de acesso (curto). 401 \`SESSION_EXPIRED\` → refresh único e repetição. |
| \`X-Cart-Id: <uuid>\` | Carrinho/cotação de visitante | Identifica o carrinho do visitante (UUID no \`localStorage\`). Ignorado quando há token. |
| \`${IDEMPOTENCY_HEADER}: <uuid>\` | \`POST /orders\` | **Obrigatório.** Mesma chave + mesmo corpo = mesmo pedido; corpo diferente = 409 \`IDEMPOTENCY_KEY_REUSED\`. |
| \`${IDEMPOTENT_REPLAY_HEADER}: true\` | Resposta de \`POST /orders\` | Indica que o pedido devolvido já existia (reenvio recuperado). |

## Erros

| Código | HTTP | Significado |
| --- | --- | --- |
${errorRows.join("\n")}

Códigos gerados só no cliente (nunca vêm da API): ${CLIENT_ERROR_CODES.map((code) => `\`${code}\``).join(", ")} (sem resposta, tempo esgotado, resposta fora do contrato, desconhecido).

## Endpoints REST

${sections.join("\n")}

## Eventos Socket.IO

- **Transporte:** somente \`websocket\` (sem long-polling), namespace padrão, eventos de texto — limitações do \`@mswjs/socket.io-binding\`. **Sem acks, sem binário, sem rooms.** Detalhes em [MOCKS.md](./MOCKS.md).
- **Conexão:** \`io(origin, { ...SOCKET_CLIENT_OPTIONS, auth: { token } })\` com \`path: "${SOCKET_PATH}"\`; opções: \`${JSON.stringify(SOCKET_CLIENT_OPTIONS)}\`.
- **Eventos:** ${SOCKET_EVENT_TYPES.map((type) => `\`${type}\``).join(", ")}. Cada evento é emitido com o nome do \`type\` e **um** argumento: o envelope abaixo.
- **Envelope:** \`id\` (UUID estável → deduplicação), \`resource\` + \`version\` (monotônica → descarte de eventos antigos), \`occurredAt\`, \`userScope?\` (só vale para esse usuário).
- **Cliente:** ignora duplicatas (mesmo \`id\`) e versões menores ou iguais à conhecida; após reconectar, reconcilia com o REST. Ver [CACHE.md](./CACHE.md).

### \`nft.updated\` — preço e disponibilidade

${table(nftUpdatedEventSchema, "output")}

### \`order.updated\` — estado do pedido (somente para o dono; \`userScope\` = id do usuário)

${table(orderUpdatedEventSchema, "output")}
`;

await writeFile("docs/CONTRACTS.md", doc);
console.info(`✔ docs/CONTRACTS.md gerado (${doc.split("\n").length} linhas)`);
