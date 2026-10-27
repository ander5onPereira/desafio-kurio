/**
 * Senhas: PBKDF2-SHA256 (WebCrypto) com sal por usuário. Nunca se guarda a senha em claro.
 * 10 mil iterações: suficiente para a simulação e rápido no navegador/Node.
 */
const ITERATIONS = 10_000;
const cache = new Map<string, string>();

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const cacheKey = `${saltHex}:${password}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const subtle = globalThis.crypto.subtle;
  const key = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = Uint8Array.from(saltHex.match(/.{2}/g) ?? [], (byte) => parseInt(byte, 16));
  const bits = await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
  const hash = toHex(bits);
  // Cache em memória só acelera o seed/reset repetido; não persiste.
  cache.set(cacheKey, hash);
  return hash;
}

export async function verifyPassword(password: string, saltHex: string, expectedHash: string): Promise<boolean> {
  return (await hashPassword(password, saltHex)) === expectedHash;
}
