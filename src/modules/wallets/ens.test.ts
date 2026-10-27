import { describe, expect, it } from "vitest";
import { joinEnsName, splitEnsName } from "./ens";

describe("ens", () => {
  it("separa nome e sufixo (sufixo mais longo vence)", () => {
    expect(splitEnsName("nova.kurio.eth")).toEqual({ name: "nova", suffix: ".kurio.eth" });
    expect(splitEnsName("ana.eth")).toEqual({ name: "ana", suffix: ".eth" });
  });

  it("sem sufixo conhecido mantém o texto e usa .eth", () => {
    expect(splitEnsName("solto")).toEqual({ name: "solto", suffix: ".eth" });
    expect(splitEnsName(null)).toEqual({ name: "", suffix: ".eth" });
  });

  it("junta nome e sufixo; nome vazio devolve vazio", () => {
    expect(joinEnsName("nova", ".kurio.eth")).toBe("nova.kurio.eth");
    expect(joinEnsName("  ", ".eth")).toBe("");
  });
});
