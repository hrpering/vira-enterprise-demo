import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const contract = JSON.parse(readFileSync(resolve("evidence/generated/contract.json"), "utf8")) as {
  readonly pack: { readonly id: string; readonly version: string; readonly digest: string };
};

test("external airline Pack renders and preserves canonical action semantics", async ({ page }) => {
  await page.goto("/proof");

  const surface = page.locator('[data-proof-surface="external-airline-pack"]');
  await expect(surface).toBeVisible();
  await expect(surface).toHaveAttribute("data-pack-id", contract.pack.id);
  await expect(surface).toHaveAttribute("data-pack-version", contract.pack.version);
  await expect(surface).toHaveAttribute("data-pack-digest", contract.pack.digest);
  await expect(surface).toHaveAttribute("lang", "en-US");
  await expect(surface).toHaveAttribute("aria-label", "External airline Experience Pack proof");

  const experience = page.locator(".vira-experience");
  await expect(experience).toBeVisible();
  await expect(experience).toHaveAttribute("aria-label", "Approved interactive flight booking");

  await page.locator('[data-proof-action="select-cheapest"]').click();
  await expect(page.locator("[data-proof-action-status]"))
    .toHaveAttribute("data-proof-action-status", "ok");
  await expect(experience).toBeVisible();
});
