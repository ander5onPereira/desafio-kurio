import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

/**
 * Sem overflow horizontal: a largura do conteúdo não pode passar da janela (tolerância de 1 px
 * para arredondamento). Tabelas/diagramas rolam dentro do próprio container, não na página.
 */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(
      () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      { message: "a página não deve rolar na horizontal" },
    )
    .toBeLessThanOrEqual(1);
}

/**
 * Listas de abas rolam só na horizontal. Com 1 px de conteúdo a mais o Chromium desenha uma barra VERTICAL
 * (com setas ▲▼, no Windows) na ponta da lista. O Playwright esconde as barras de rolagem, então a checagem
 * é pela geometria: a altura rolável não pode passar da visível.
 */
export async function expectNoVerticalScrollInTablists(page: Page): Promise<void> {
  const lists = page.getByRole("tablist");
  await expect(lists.first()).toBeVisible();
  await expect
    .poll(
      () => lists.evaluateAll((elements) => elements.filter((el) => el.scrollHeight > el.clientHeight).map((el) => el.getAttribute("aria-label") ?? "(sem nome)")),
      { message: "as listas de abas não devem rolar na vertical" },
    )
    .toEqual([]);
}

interface A11yOptions {
  exclude?: string[];
  include?: string;
}

/**
 * Executa o axe e falha com violações SÉRIAS ou CRÍTICAS (WCAG 2.0/2.1 A e AA).
 * A mensagem lista regra, impacto e os seletores afetados.
 */
export async function expectNoA11yViolations(page: Page, options: A11yOptions = {}): Promise<void> {
  // O painel de cenários do mock é ferramenta de teste/demonstração, não a interface do produto.
  let builder = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude('[aria-label$="abrir painel de cenários"]');
  if (options.include) builder = builder.include(options.include);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);

  const { violations } = await builder.analyze();
  const blocking = violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
  const report = blocking.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n` +
      violation.nodes.slice(0, 3).map((node) => `  - ${node.target.join(" ")}`).join("\n"),
  );
  expect(report, `Violações de acessibilidade:\n${report.join("\n")}`).toEqual([]);
}
