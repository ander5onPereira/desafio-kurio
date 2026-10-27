/**
 * Pipeline de imagens: PNGs-fonte (src/assets/artworks) → AVIF + WebP em public/img.
 * As artes originais têm 250×250 px (limitação documentada em ARCHITECTURE.md): NÃO há upscale.
 * Tamanhos gerados: 250 (nativo) e 128 (miniaturas, carrinho, recibo).
 *
 * Uso: npm run images
 * Saída: public/img/artwork-<chave>-<tamanho>.<avif|webp>
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE_DIR = path.resolve("src/assets/artworks");
const OUTPUT_DIR = path.resolve("public/img");

/** Mapeamento arquivo → chave de arte (ver ARTWORK_KEYS em src/contracts/common.ts). */
const ARTWORKS = {
  golden: "NFT-Artwork-01.png",
  emerald: "NFT-Artwork-02.png",
  sage: "NFT-Artwork-03.png",
  ivory: "NFT-Artwork-04.png",
} as const;

const SIZES = [250, 128] as const;

await mkdir(OUTPUT_DIR, { recursive: true });

for (const [key, file] of Object.entries(ARTWORKS)) {
  const input = path.join(SOURCE_DIR, file);
  for (const size of SIZES) {
    const base = sharp(input).resize(size, size, { fit: "cover", withoutEnlargement: true });
    await base.clone().avif({ quality: 60, effort: 6 }).toFile(path.join(OUTPUT_DIR, `artwork-${key}-${size}.avif`));
    await base.clone().webp({ quality: 82, effort: 6 }).toFile(path.join(OUTPUT_DIR, `artwork-${key}-${size}.webp`));
    console.info(`✔ artwork-${key}-${size}`);
  }
}
