import { expect, test, type Page } from "@playwright/test";

for (const gated of [false, true]) {
  test(`entry tabs keep the surrounding layout still (host gate: ${gated})`, async ({ page }) => {
    await page.route("**/api/config", (route) => route.fulfill({ json: { data: { hostKeyRequired: gated } } }));
    await page.goto("/");
    for (const en of [false, true]) {
      if (en) await page.getByRole("button", { name: "EN", exact: true }).click();
      const joinTab = page.getByRole("button", { name: en ? "Join friends" : "加入朋友", exact: true });
      const hostTab = page.getByRole("button", { name: en ? "Host a room" : "我來開房", exact: true });
      await hostTab.click();
      if (gated) await expect(page.getByLabel(en ? "Host passcode" : "主持人通行碼")).toBeVisible();
      await joinTab.click();
      const measure = () => page.locator(".site-header, .home-intro, .entry-card, .entry-card h2, .entry-tabs, .site-footer").evaluateAll((elements) => elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
      }));
      const before = await measure();
      await hostTab.click();
      expect(await measure()).toEqual(before);
      await expect(page.getByRole("textbox", { name: en ? "Six-digit room code" : "六位數房號" })).toHaveCount(0);
      await joinTab.click();
      expect(await measure()).toEqual(before);
      await expect(page.getByRole("button", { name: en ? "Open a room" : "開一間房", exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
}

/**
 * The critical end-to-end scenario from BUILD_PLAN §12, played through the real
 * UI: one host and two players in isolated contexts complete a whole round
 * without any manual database intervention.
 */

async function join(page: Page, code: string, nickname: string) {
  await page.goto("/");
  await page.getByLabel("六位數房號").fill(code);
  await page.getByLabel("怎麼稱呼你？").fill(nickname);
  await page.getByRole("button", { name: /入座，開始想/ }).click();
  await expect(page).toHaveURL(/\/room\//);
}

test("host and two players complete a full round", async ({ browser }) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  const [host, p1, p2] = await Promise.all(contexts.map((c) => c.newPage()));

  // 1 — Host opens a room.
  // A deployment that gates hosting takes the passcode from the URL.
  await host.goto(`/?host=${process.env.MKK_HOST_KEY ?? ""}`);
  await host.getByRole("button", { name: "我來開房" }).click();
  await host.getByRole("button", { name: /開一間房/ }).click();
  await expect(host).toHaveURL(/\/host\//);
  const code = (await host.locator(".room-code").innerText()).trim();
  expect(code).toMatch(/^\d{6}$/);

  // 2 — Two anonymous players take seats from separate contexts.
  await join(p1, code, "Kenny");
  await join(p2, code, "Alan");
  await expect(host.locator(".player-row")).toHaveCount(2);

  // 3 — Host submits material; the briefing is generated from it.
  // Load ready-made material from the sample chips rather than typing it.
  await host.getByRole("button", { name: /四天工作制/ }).click();
  await expect(host.locator("#source-material")).toHaveValue(/四天/);
  await host.getByRole("button", { name: /產生中立導讀/ }).click();
  await expect(host.getByRole("button", { name: /開始秘密作答/ })).toBeEnabled();
  await expect(p1.locator(".briefing-surface")).toBeVisible();

  // The original text stays available beside the briefing.
  await p1.getByText("看看原文", { exact: true }).click();
  await expect(p1.locator("blockquote")).toContainText("四天");

  // 4 — Host opens private answering.
  await host.getByRole("button", { name: /開始秘密作答/ }).click();
  await expect(p1.getByRole("radio", { name: /傾向是/ })).toBeVisible();

  // 5 — Player 1 answers; nothing leaks to player 2 or the host.
  await p1.getByRole("radio", { name: /傾向是/ }).check();
  await p1.getByRole("button", { name: /收好想法，抽一張卡/ }).click();
  await expect(p1.getByRole("heading", { name: /已收好/ })).toBeVisible();
  await expect(p2.locator(".reveal-card")).toHaveCount(0);
  await expect(p2.getByRole("radio", { name: /傾向是/ })).toBeVisible();
  await expect(host.getByRole("radio")).toHaveCount(0);

  // 6 — Player 2 answers; the phase advances and each gets a different angle.
  await p2.getByRole("radio", { name: /傾向不是/ }).check();
  await p2.getByRole("button", { name: /收好想法，抽一張卡/ }).click();

  for (const page of [p1, p2]) {
    await expect(page.locator(".thinking-card")).toBeVisible();
  }
  const angle1 = await p1.locator(".thinking-body h2").innerText();
  const angle2 = await p2.locator(".thinking-body h2").innerText();
  expect(angle1).not.toBe(angle2);

  // 7 — Card answers, then the synchronized reveal.
  for (const page of [p1, p2]) {
    await page.getByRole("radio", { name: "更懷疑原本的說法" }).check();
    await page.locator('.reason-options input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: /收好這個角度/ }).click();
  }
  for (const page of [host, p1, p2]) {
    await expect(page.locator(".reveal-card")).toHaveCount(2);
  }

  // 8 — Discussion, then final positions.
  await host.getByRole("button", { name: /開始面對面討論/ }).click();
  await host.getByRole("button", { name: /開始最終表態/ }).click();

  for (const page of [p1, p2]) {
    await expect(page.getByRole("radio", { name: "想法沒有變" })).toBeVisible();
    await page.getByRole("radio", { name: "想法沒有變" }).check();
    await page.getByRole("radio", { name: /還不確定/ }).check();
    await page.getByRole("button", { name: /送出最終想法/ }).click();
  }

  // 9 — Every player approves every statement before publication is possible.
  await expect(p1.locator(".statement")).not.toHaveCount(0);
  for (const page of [p1, p2]) {
    const agree = page.getByRole("button", { name: "我同意" });
    const count = await agree.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) await agree.nth(i).click();
  }

  // 10 — The host publishes; everyone reads the same closing summary.
  await host.getByRole("button", { name: /發布共識地圖/ }).click();
  for (const page of [host, p1, p2]) {
    await expect(page.locator(".outcome__text")).toBeVisible();
  }
  // The statements that back it are one disclosure away, not gone.
  await p1.locator(".map-detail > summary").click();
  await expect(p1.locator(".map-section").first()).toBeVisible();
  expect(
    await p1.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);

  await Promise.all(contexts.map((c) => c.close()));
});

test("an unknown room is refused and English entry renders", async ({ page }) => {
  await page.goto("/room/00000000-0000-0000-0000-000000000000?lang=en");
  await expect(page.getByRole("heading", { name: "This seat isn’t available." })).toBeVisible();
  await page.getByRole("link", { name: /Back to the table/ }).click();
  // Wait for the entry screen to render before toggling: the language switch is
  // client state, so clicking it pre-hydration would silently do nothing.
  await expect(page.getByRole("heading", { name: "留了一個位子給你。" })).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { name: "There’s a seat for you." })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test("joining a room that does not exist reports it clearly", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /入座，開始想/ }).click();
  await expect(page.locator("#join-error")).toHaveText("請輸入 1–20 字的暱稱。");
  await page.getByLabel("怎麼稱呼你？").fill("Alex");
  await page.getByLabel("六位數房號").fill("12345");
  await page.getByRole("button", { name: /入座，開始想/ }).click();
  await expect(page.locator("#join-error")).toHaveText("請輸入六位數房號。");
  await page.getByLabel("六位數房號").fill("123456");
  await page.getByRole("button", { name: /入座，開始想/ }).click();
  await expect(page.locator("#join-error")).toContainText("查無這個房號");
});
