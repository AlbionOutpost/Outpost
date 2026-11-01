import { getPrices } from "../src/lib/albion/market-client";
import { getHistory, getGold } from "../src/lib/albion/history-client";
import { redis } from "../src/lib/redis";
try {
  process.loadEnvFile(".env");
} catch {}
const tasks = (["americas", "europe", "asia"] as const).flatMap((region) => [
  { name: `${region}:prices`, run: () => getPrices(region, ["T4_BAG"], 1) },
  { name: `${region}:history`, run: () => getHistory(region, "T4_BAG", "Lymhurst", 1) },
  { name: `${region}:gold`, run: () => getGold(region) },
]);
const results = await Promise.allSettled(
  tasks.map(async (task) => ({ name: task.name, rows: (await task.run()).length })),
);
for (let i = 0; i < results.length; i++) {
  const result = results[i];
  if (result.status === "fulfilled") console.log(JSON.stringify(result.value));
  else {
    console.error(`${tasks[i].name}: ${String(result.reason)}`);
    process.exitCode = 1;
  }
}
await redis()?.quit();
