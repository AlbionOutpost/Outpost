import { mkdirSync, writeFileSync } from "node:fs";
const hosts = { americas: "west", europe: "europe", asia: "east" };
const rows = [];
for (const [region, host] of Object.entries(hosts)) {
  const [app, raw] = await Promise.all([
    fetch(`http://localhost:3102/api/market?region=${region}&item=T4_BAG&quality=1`),
    fetch(`https://${host}.albion-online-data.com/api/v2/stats/prices/T4_BAG.json?qualities=1`, {
      headers: { "Accept-Encoding": "gzip, deflate" },
      signal: AbortSignal.timeout(12000),
    }),
  ]);
  if (!app.ok || !raw.ok) throw new Error(`Live comparison unavailable for ${region}`);
  const [a, r] = await Promise.all([app.json(), raw.json()]);
  const mismatches = a.prices.filter(
    (row) =>
      !r.some((source) =>
        [
          "item_id",
          "city",
          "quality",
          "sell_price_min",
          "sell_price_min_date",
          "buy_price_max",
          "buy_price_max_date",
        ].every((k) => source[k] === row[k]),
      ),
  );
  rows.push({
    region,
    sourceHost: host,
    rowsCompared: a.prices.length,
    matches: mismatches.length === 0,
    sample: a.prices.find((p) => p.city === "Lymhurst") || null,
  });
  if (mismatches.length) process.exitCode = 1;
}
mkdirSync(".qa", { recursive: true });
writeFileSync(
  ".qa/live-comparison.json",
  JSON.stringify({ checkedAt: new Date().toISOString(), rows }, null, 2),
);
console.log(
  JSON.stringify(
    rows.map(({ region, rowsCompared, matches }) => ({ region, rowsCompared, matches })),
  ),
);
