import { writeFileSync } from "node:fs";
const results = [];
for (const path of ["/api/health", "/api/market?region=europe&item=T4_BAG&quality=1"]) {
  const samples = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    const response = await fetch(`http://localhost:3102${path}`);
    await response.arrayBuffer();
    if (!response.ok) throw new Error(`Measurement failed: ${response.status}`);
    samples.push(performance.now() - start);
  }
  const sorted = samples.slice(1).sort((a, b) => a - b);
  results.push({
    path,
    firstRequestMs: samples[0],
    warmP50Ms: sorted[Math.floor(sorted.length * 0.5)],
    warmP95Ms: sorted[Math.floor(sorted.length * 0.95)],
    samples: 20,
    environment: "Local loopback app container, no artificial network throttling",
    warmTargetMs: 500,
  });
}
writeFileSync(".qa/api-timings.json", JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
