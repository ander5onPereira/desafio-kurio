import { describe, expect, it } from "vitest";
import { closeTarget, safeRedirect } from "./redirect";

describe("closeTarget", () => {
  it("volta ao redirect público", () => {
    expect(closeTarget("/nft/abc")).toBe("/nft/abc");
  });

  it("não volta a uma rota privada (evita laço com o guard)", () => {
    expect(closeTarget("/pagamento")).toBe("/");
    expect(closeTarget("/perfil/carteiras")).toBe("/");
    expect(closeTarget("/pedidos/123")).toBe("/");
  });

  it("usa o início para valores inválidos", () => {
    expect(closeTarget("https://evil.test")).toBe("/");
    expect(closeTarget(undefined)).toBe("/");
  });
});

describe("safeRedirect", () => {
  it("aceita caminhos internos (com query e hash)", () => {
    expect(safeRedirect("/pagamento")).toBe("/pagamento");
    expect(safeRedirect("/?q=ape&page=2")).toBe("/?q=ape&page=2");
    expect(safeRedirect("/nft/abc#detalhes")).toBe("/nft/abc#detalhes");
  });

  it("rejeita URLs externas e protocolo relativo", () => {
    expect(safeRedirect("https://evil.test")).toBe("/");
    expect(safeRedirect("//evil.test")).toBe("/");
    expect(safeRedirect("/\\evil.test")).toBe("/");
    expect(safeRedirect("javascript:alert(1)")).toBe("/");
  });

  it("rejeita valores que não são string e caracteres de controle", () => {
    expect(safeRedirect(undefined)).toBe("/");
    expect(safeRedirect(42)).toBe("/");
    expect(safeRedirect("/ok\nhttps://evil")).toBe("/");
  });

  it("não volta para as telas de autenticação (evita laço)", () => {
    expect(safeRedirect("/login")).toBe("/");
    expect(safeRedirect("/cadastro?redirect=/x")).toBe("/");
  });

  it("usa o fallback informado", () => {
    expect(safeRedirect("x", "/carrinho")).toBe("/carrinho");
  });
});
