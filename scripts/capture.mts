/**
 * Screenshots app pages for design review, using the installed Chrome.
 * Signs in as a fresh demo visitor first, so captures show sample data.
 *
 *   pnpm capture /home /activity            → .impeccable/review/<name>-{mobile,desktop}.png
 *   pnpm capture --only mobile /home
 *   HIDE_DEMO_NOTICE=1 pnpm capture /home   → without the demo notice
 */
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";
import { DEMO_BANNER_COOKIE, DEMO_BANNER_DISMISSED } from "../src/ui/demo-banner-cookie";

const BASE = process.env.CAPTURE_BASE ?? "http://localhost:3000";
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
} as const;

const args = process.argv.slice(2);
const only = args[0] === "--only" ? (args[1] as keyof typeof VIEWPORTS) : null;
const paths = only ? args.slice(2) : args;
const fullPage = process.env.FULL_PAGE !== "0";

await mkdir(".impeccable/review", { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: "networkidle0" });
  if (process.env.CAPTURE_SIGNED_OUT !== "1") {
    const status = await page.evaluate(async () => {
      const res = await fetch("/api/auth/sign-in/anonymous", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      return res.status;
    });
    if (status !== 200) throw new Error(`Demo sign-in failed (${status})`);
    // HIDE_DEMO_NOTICE=1 closes the demo notice first, as a visitor would (README shots).
    if (process.env.HIDE_DEMO_NOTICE === "1") {
      await page.setCookie({ name: DEMO_BANNER_COOKIE, value: DEMO_BANNER_DISMISSED, url: BASE });
    }
  }
  // `{receipt}` in a path becomes a freshly scanned sample receipt (one OCR call).
  let receiptId: string | null = null;
  if (paths.some((p) => p.includes("{receipt}"))) {
    receiptId = await page.evaluate(async () => {
      const image = await (await fetch("/samples/receipt-grocer.jpg")).blob();
      const body = new FormData();
      body.append("image", image, "receipt.jpg");
      const res = await fetch("/api/receipts", { method: "POST", body });
      return (await res.json()).receipt?.id ?? null;
    });
    if (!receiptId) throw new Error("Sample scan failed");
  }
  for (const raw of paths) {
    // "/recap/2026-09@3" captures the page after pressing → three times.
    const [route, steps = "0"] = raw.split("@");
    const path = route.replace("{receipt}", receiptId ?? "");
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      if (only && name !== only) continue;
      await page.setViewport(viewport);
      // Reduced motion: captures show settled content, never mid-animation.
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
      await page.evaluate(() => document.fonts.ready);
      for (let i = 0; i < Number(steps); i++) await page.keyboard.press("ArrowRight");
      // CLICK=<selector> presses one control first (e.g. an expand toggle).
      if (process.env.CLICK) await page.click(process.env.CLICK).catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 150));
      const slug = raw.replace(/^\//, "").replace(/[{}]/g, "").replace(/[/?=&@]+/g, "-") || "root";
      const file = `.impeccable/review/${slug}-${name}.png`;
      await page.screenshot({ path: file, fullPage });
      console.log(file);
    }
  }
} finally {
  await browser.close();
}
