import { expect, test } from "@playwright/test";

test("player completes Chinese and English preview without exceeding two reasons", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "入座，開始想" }).click();
  await expect(page.locator("#join-error")).toHaveText("請輸入 1–20 字的暱稱。");
  await page.getByLabel("怎麼稱呼你？").fill("Alex");
  await page.getByLabel("六位數房號").fill("123456");
  await page.getByRole("button", { name: "入座，開始想" }).click();
  await expect(page.locator("#join-error")).toContainText("只支援房號 482916");
  await page.getByLabel("六位數房號").fill("482916");
  await page.getByRole("button", { name: "入座，開始想" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("人到齊，話題就開始。");
  await page.getByRole("button", { name: "模擬主持人開始" }).click();
  await page.getByText("看看原文", { exact: true }).click();
  await expect(page.locator("blockquote")).toContainText("所有公司");
  await page.getByRole("button", { name: "模擬開放作答" }).click();
  await expect(page.getByRole("button", { name: "收好想法，抽一張卡" })).toBeDisabled();
  await page.getByRole("radio", { name: /還不確定/ }).check();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("radio", { name: /Not sure yet/ })).toBeChecked();
  await page.getByRole("button", { name: "Save my view & draw a card" }).click();
  await page.getByRole("radio", { name: "Less convinced", exact: true }).check();
  await page.getByRole("checkbox", { name: "Sample is too small" }).check();
  await page.getByRole("checkbox", { name: "Industries differ" }).check();
  await expect(page.getByRole("checkbox", { name: "Wellbeing matters too" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Sample is too small" }).uncheck();
  await page.getByRole("checkbox", { name: "Not enough information" }).check();
  await expect(page.getByText("Wellbeing is worth exploring", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Save my card response" }).click();
  await expect(page.getByRole("heading", { name: "Saved. Let’s wait for the others." })).toBeVisible();
  await expect(page.getByText("Wellbeing is worth exploring", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Simulate everyone ready & reveal" }).click();
  await expect(page.getByText("Wellbeing is worth exploring", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Not sure yet", exact: true })).toBeVisible();
  await expect(page.getByText("Industries differ", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simulate everyone ready & reveal" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("host sees progress without private answer controls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "我來開房" }).click();
  await page.getByRole("link", { name: "開啟房間預覽" }).click();
  await page.getByRole("button", { name: "預覽這則導讀" }).click();
  await page.getByRole("button", { name: "開始初答預覽" }).click();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByText("這裡只顯示完成進度", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "模擬全員完成初答" }).click();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByRole("button", { name: "模擬全員完成卡片" }).click();
  await page.getByRole("button", { name: "模擬全員完成並翻牌" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("答案不同，才有得聊。");
});

test("invalid preview room and English entry render clearly", async ({ page }) => {
  await page.goto("/room/000000?lang=en");
  await expect(page.getByRole("heading", { name: "This seat isn’t available." })).toBeVisible();
  await page.getByRole("link", { name: "Back to the table" }).click();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { name: "There’s a seat for you." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
