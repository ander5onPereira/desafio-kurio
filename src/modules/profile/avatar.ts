export const AVATAR_ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const AVATAR_MAX_INPUT_BYTES = 5 * 1024 * 1024; // arquivo escolhido (antes de reduzir)
export const AVATAR_MAX_SIDE = 256; // px do lado maior após reduzir

export class AvatarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarError";
  }
}

export function validateAvatarFile(file: Pick<File, "type" | "size">): void {
  if (!AVATAR_ACCEPTED_TYPES.includes(file.type as (typeof AVATAR_ACCEPTED_TYPES)[number])) {
    throw new AvatarError("Formato não suportado. Use PNG, JPG ou WebP.");
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    throw new AvatarError("Imagem muito grande. O limite é de 5 MB.");
  }
}

export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Valida e reduz a imagem (lado maior ≤ 256 px) para data URL WebP — é o que a API recebe.
 * Roda no navegador (canvas); mantém o envio leve e o avatar dentro do limite do contrato.
 */
export async function prepareAvatar(file: File): Promise<string> {
  validateAvatarFile(file);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new AvatarError("Não foi possível ler a imagem. Tente outro arquivo.");
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height, AVATAR_MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new AvatarError("Não foi possível processar a imagem neste navegador.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/webp", 0.85);
}
