import { describe, expect, it } from "vitest";
import { AvatarError, fitWithin, validateAvatarFile } from "./avatar";

describe("avatar", () => {
  it("aceita png/jpeg/webp dentro do limite", () => {
    expect(() => validateAvatarFile({ type: "image/png", size: 1000 })).not.toThrow();
    expect(() => validateAvatarFile({ type: "image/webp", size: 1000 })).not.toThrow();
  });

  it("recusa formato inválido e arquivo grande demais", () => {
    expect(() => validateAvatarFile({ type: "image/gif", size: 10 })).toThrow(AvatarError);
    expect(() => validateAvatarFile({ type: "image/png", size: 6 * 1024 * 1024 })).toThrow(AvatarError);
  });

  it("reduz mantendo a proporção e nunca amplia", () => {
    expect(fitWithin(1024, 512, 256)).toEqual({ width: 256, height: 128 });
    expect(fitWithin(100, 80, 256)).toEqual({ width: 100, height: 80 });
  });
});
