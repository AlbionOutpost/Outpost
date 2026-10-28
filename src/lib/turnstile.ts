import { HttpError } from "./api-errors";

type Configuration = {
  sitekey?: string;
  secret?: string;
  hostnames?: string;
  production: boolean;
  required?: boolean;
};
export function turnstileConfiguration(): Configuration {
  let ownedProduction = false;
  try {
    ownedProduction =
      process.env.NODE_ENV === "production" &&
      ["albionoutpost.com", "www.albionoutpost.com"].includes(
        new URL(process.env.NEXTAUTH_URL || "").hostname,
      );
  } catch {
    /* Invalid origins are rejected separately during deployment validation. */
  }
  return {
    sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    secret: process.env.TURNSTILE_SECRET,
    hostnames: process.env.TURNSTILE_HOSTNAMES,
    production: process.env.NODE_ENV === "production",
    required: ownedProduction,
  };
}

/** Siteverify is authoritative: no successful-token cache, IP-header trust or client bypass. */
export async function verifyTurnstile(
  token: string | null,
  action: "community_write",
  config = turnstileConfiguration(),
  send: typeof fetch = fetch,
) {
  // Explicitly unconfigured local/staging applications keep existing behavior.
  // A partially configured deployment always fails closed.
  if (!config.required && !config.sitekey && !config.secret && !config.hostnames) return;
  const hosts = (config.hostnames || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  if (
    !config.sitekey ||
    !config.secret ||
    !hosts.length ||
    hosts.some((h) => !/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|127\.0\.0\.1)$/.test(h)) ||
    (config.production && hosts.some((h) => h === "localhost" || h === "127.0.0.1"))
  )
    throw new HttpError(503, "Bot verification is unavailable. Please try again later.");
  if (!token || token.length > 2048 || !token.trim())
    throw new HttpError(403, "Complete the bot verification before posting.");
  let result: { success?: boolean; action?: string; hostname?: string };
  try {
    const response = await send("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: config.secret, response: token }),
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok || !response.body) throw Error("Verification unavailable");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 16384) throw Error("Oversized verification response");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!result || typeof result !== "object") throw Error("Invalid verification response");
  } catch {
    throw new HttpError(503, "Bot verification is unavailable. Please try again later.");
  }
  if (result.success !== true || result.action !== action || !hosts.includes(result.hostname || ""))
    throw new HttpError(403, "Bot verification expired or failed. Please try again.");
}
