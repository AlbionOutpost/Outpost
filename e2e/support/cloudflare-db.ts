import type { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { encode, decode, type Wire } from "./wire";

export async function cloudflareFixture(method: "query" | "fault", args: unknown[]) {
  if (process.env.E2E_CLOUDFLARE !== "1")
    throw new Error("Cloudflare fixtures require the explicit local test runtime");
  const key = readFileSync(".qa/cloudflare-web-test/fixture-key", "utf8");
  const response = await fetch("http://localhost:3000/__local_qa/fixture", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Outpost-QA-Key": key },
    body: JSON.stringify({ method, args: encode(args) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new Error(`Local Cloudflare fixture transport failed (${response.status})`);
  const reply = decode((await response.json()) as Wire) as {
    ok: boolean;
    value?: unknown;
    error?: { kind: string; status?: number; code?: string };
  };
  if (!reply.ok)
    throw new Error(
      `Local Cloudflare fixture failed (${reply.error?.kind ?? "unknown"}/${reply.error?.code ?? reply.error?.status ?? "unknown"})`,
    );
  return reply.value;
}
export function cloudflareTestDb(): PrismaClient {
  return new Proxy(
    {},
    {
      get(_target, model) {
        if (model === "$disconnect") return async () => {};
        if (typeof model !== "string" || model.startsWith("$"))
          throw new Error(
            "Raw SQL and interactive fixture transactions are not exposed by the test transport",
          );
        return new Proxy(
          {},
          {
            get: (_delegate, operation) => async (args: unknown) => {
              const results = (await cloudflareFixture("query", [
                [{ model, operation: String(operation), args }],
              ])) as unknown[];
              return results[0];
            },
          },
        );
      },
    },
  ) as PrismaClient;
}
