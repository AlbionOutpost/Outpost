import { lstatSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { StringDecoder } from "node:string_decoder";

export const credentialFile = fileURLToPath(new URL("../.env.cloudflare", import.meta.url));
const apiRoot = "https://api.cloudflare.com/client/v4";

export function loadCloudflareCredentials({ dns = false } = {}) {
  const stat = lstatSync(credentialFile);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8192 || stat.mode & 0o077)
    throw Error("Cloudflare credentials must be an owner-only regular .env.cloudflare file.");
  const values = parseEnv(readFileSync(credentialFile, "utf8"));
  const token =
    dns && values.CLOUDFLARE_DNS_API_TOKEN
      ? values.CLOUDFLARE_DNS_API_TOKEN
      : values.CLOUDFLARE_API_TOKEN;
  if (!token || !/^[A-Za-z0-9_-]{30,150}$/.test(token))
    throw Error("The workspace Cloudflare token is missing or malformed.");
  const accountId = values.CLOUDFLARE_ACCOUNT_ID;
  const zoneId = values.OUTPOST_CLOUDFLARE_ZONE_ID;
  if (!/^[a-f0-9]{32}$/.test(accountId || "") || !/^[a-f0-9]{32}$/.test(zoneId || ""))
    throw Error("The workspace Cloudflare account/zone selection is missing or malformed.");
  return { token, accountId, zoneId };
}

export function cloudflareUrl(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//"))
    throw Error("Use a relative Cloudflare API path beginning with one slash.");
  const url = new URL(apiRoot + path);
  if (
    url.origin !== "https://api.cloudflare.com" ||
    !url.pathname.startsWith("/client/v4/") ||
    url.hash
  )
    throw Error("Cloudflare requests must stay within the official API origin and version.");
  return url;
}

export function redactValues(text, secrets) {
  for (const value of secrets) if (value) text = text.split(value).join("[redacted]");
  return text;
}

/** Retain incomplete lines/token suffixes so credentials split across chunks are still redacted. */
export function pipeRedacted(stream, output, secret) {
  const secrets = (Array.isArray(secret) ? secret : [secret]).filter(Boolean);
  const retained = Math.max(1, ...secrets.map((value) => value.length)) - 1;
  const decoder = new StringDecoder("utf8");
  let pending = "";
  const write = (text) => output.write(redactValues(text, secrets));
  stream.on("data", (chunk) => {
    pending += decoder.write(chunk);
    let end;
    while ((end = pending.indexOf("\n")) !== -1) {
      write(pending.slice(0, end + 1));
      pending = pending.slice(end + 1);
    }
    if (pending.length > 65536) {
      pending = redactValues(pending, secrets);
      const keep = retained;
      if (!keep) {
        write(pending);
        pending = "";
        return;
      }
      write(pending.slice(0, -keep));
      pending = pending.slice(-keep);
    }
  });
  stream.on("end", () => write(pending + decoder.end()));
}

/** Fixed-origin API client for explicitly requested management tasks. Does not log response bodies. */
export async function cloudflareRequest(method, path, body, options = {}) {
  const credentials = options.credentials || loadCloudflareCredentials();
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method))
    throw Error("Unsupported Cloudflare HTTP method.");
  const url = cloudflareUrl(path);
  const response = await (options.fetch || fetch)(url, {
    method,
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  const reader = response.body?.getReader();
  if (!reader) throw Error("Cloudflare returned an empty response.");
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8 * 1024 * 1024) throw Error("Cloudflare response exceeded 8MB.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Error(`Cloudflare returned non-JSON data (HTTP ${response.status}).`);
  }
  if (!response.ok || data?.success !== true) {
    const codes = Array.isArray(data?.errors)
      ? data.errors.map((error) => error.code).filter(Number.isFinite)
      : [];
    // Upstream messages/bodies can contain reflected credentials; print only numeric error codes.
    throw Error(
      `Cloudflare request failed (HTTP ${response.status}; codes: ${codes.join(", ") || "unavailable"}).`,
    );
  }
  return data;
}

export async function cloudflareStatus() {
  const credentials = loadCloudflareCredentials();
  const authPath = credentials.token.startsWith("cfat_")
    ? `/accounts/${credentials.accountId}/tokens/verify`
    : "/user/tokens/verify";
  const [verified, zone] = await Promise.all([
    cloudflareRequest("GET", authPath, undefined, { credentials }),
    cloudflareRequest("GET", `/zones/${credentials.zoneId}`, undefined, { credentials }),
  ]);
  return {
    authentication: credentials.token.startsWith("cfat_") ? "account API token" : "API token",
    tokenStatus: verified.result.status,
    expiresOn: verified.result.expires_on || null,
    zone: { name: zone.result.name, status: zone.result.status },
    persistentCredentialFile: ".env.cloudflare",
    scope:
      "Workspace-local authentication; remote read checks only, no deployment or account changes.",
  };
}
