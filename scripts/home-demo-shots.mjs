// Regenerates the landing page's product screenshots from a running dev server.
// Usage: PLAYWRIGHT_CHROMIUM_PATH=... node scripts/home-demo-shots.mjs [--base http://localhost:3000]
// Outputs public/home/{market-explorer,build-detail,crafting-calculator}.webp (1600px wide, q82).
import { chromium } from "playwright";
import sharp from "sharp";
const shots = [
  ["/tools/market?item=T4_BAG&region=europe", "market-explorer", ".market-workspace", 1280],
  [
    "/builds/library/battleaxe-mist-build?region=europe",
    "build-detail",
    ".build-detail-page",
    1280,
  ],
  ["/tools/crafting?region=europe", "crafting-calculator", ".production-workspace", 1280],
];
const base = (
  process.argv.includes("--base")
    ? process.argv[process.argv.indexOf("--base") + 1]
    : "http://localhost:3000"
).replace(/\/$/, "");
const b = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
  args: ["--no-sandbox"],
});
for (const [url, name, selector, width] of shots) {
  const p = await b.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1.5 });
  await p.goto(base + url, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await p.evaluate(
    () => document.activeElement instanceof HTMLElement && document.activeElement.blur(),
  );
  const box = await p.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { x: r.left, y: r.top + window.scrollY, width: r.width, height: r.height };
  }, selector);
  const clip = { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 728) };
  const png = await p.screenshot({ clip, fullPage: true });
  await sharp(png).resize({ width: 1600 }).webp({ quality: 82 }).toFile(`public/home/${name}.webp`);
  console.log(name, clip);
  await p.close();
}
await b.close();
