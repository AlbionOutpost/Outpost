// Deterministic social artwork from the existing owner-approved scene/logo and brand fonts.
// Optional maintenance helper only; production serves the committed static PNG (no browser/runtime OG cost).
import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
const data = async (path, mime) =>
  `data:${mime};base64,${(await readFile(path)).toString("base64")}`;
const [scene, logo, displayFont, uiFont] = await Promise.all([
  data("public/albion/illustrations/hero-v1.webp", "image/webp"),
  data("public/brand/outpost-logo-dark.webp", "image/webp"),
  data(
    "node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2",
    "font/woff2",
  ),
  data("public/fonts/inter-latin-400-800.woff2", "font/woff2"),
]);
const browser = await chromium.launch({ chromiumSandbox: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
@font-face{font-family:Barlow;src:url('${displayFont}')}@font-face{font-family:Inter;src:url('${uiFont}');font-weight:400 800}
*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}body{background:#101215;color:#f4f2ee;font-family:Inter,sans-serif}.scene{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:right center}.shade{position:absolute;inset:0;background:linear-gradient(90deg,#101215fa 0%,#101215eb 38%,#1012159c 65%,#10121524 100%)}.logo{position:absolute;top:46px;left:60px;width:264px;height:auto}.copy{position:absolute;left:64px;top:215px}h1{margin:0;font:800 102px/.94 Barlow,sans-serif;letter-spacing:-.015em}em{color:#ee945a;font-style:normal}.line{margin:30px 0 0;font:500 22px/1.5 Inter,sans-serif;color:#e2d9cf}.foot{position:absolute;left:64px;right:64px;bottom:38px;display:flex;justify-content:space-between;border-top:1px solid #b58a654d;padding-top:20px;font:500 16px/1.3 Inter,sans-serif;color:#c4b9ac}.domain{color:#eea574}
</style><body><img class="scene" src="${scene}" alt=""><div class="shade"></div><img class="logo" src="${logo}" alt="Outpost"><div class="copy"><h1>Your Albion<br><em>advantage.</em></h1><p class="line">Market prices · Builds · Calculators</p></div><div class="foot"><span>Independent Albion Online tools</span><span class="domain">albionoutpost.com</span></div></body></html>`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  await mkdir("public/brand", { recursive: true });
  const shot = await page.screenshot({ type: "png" });
  // 256-colour palette PNG: ~300 KB instead of ~800 KB with no visible banding on this card.
  const { default: sharp } = await import("sharp");
  await sharp(shot)
    .png({ palette: true, quality: 90, compressionLevel: 9, effort: 10, colours: 256, dither: 0.8 })
    .toFile("public/brand/outpost-social.png");
} finally {
  await browser.close();
}
console.log("Built static Outpost social image at 1200x630.");
