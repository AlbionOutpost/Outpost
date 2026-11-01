import { lstatSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

export function loadDiscordCredentials() {
  const path = new URL("../.env.discord", import.meta.url);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8192 || stat.mode & 0o077)
    throw Error("Discord management credentials must be an owner-only regular file.");
  const values = parseEnv(readFileSync(path, "utf8"));
  const token = values.DISCORD_BOT_TOKEN;
  if (!token || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
    throw Error("A valid Discord bot credential is required.");
  return { token };
}

/** Self-profile management only: no messages, invitations, guild/user changes or redirects. */
export async function discordRequest(method, path, body, options = {}) {
  if (!["GET", "PATCH"].includes(method) || !["/users/@me", "/applications/@me"].includes(path))
    throw Error("Only the bot's own documented profile/application endpoints are allowed.");
  const { token } = options.credentials || loadDiscordCredentials();
  const response = await (options.fetch || fetch)(`https://discord.com/api/v10${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  const reader = response.body?.getReader();
  if (!reader) throw Error("Discord returned an empty response.");
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 8 * 1024 * 1024) throw Error("Discord response exceeded 8MB.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Error(`Discord returned non-JSON data (HTTP ${response.status}).`);
  }
  if (!response.ok)
    throw Error(
      `Discord request failed (HTTP ${response.status}; code: ${Number.isFinite(data?.code) ? data.code : "unavailable"}).`,
    );
  return data;
}

export function assertOutpostIdentity(user, application) {
  if (
    user.bot !== true ||
    application.id !== user.id ||
    !/^(?:Albion )?Outpost$/i.test(application.name)
  )
    throw Error(
      "Refusing to change a non-bot, mismatched application or another project's identity.",
    );
}
