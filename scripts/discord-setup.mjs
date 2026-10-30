import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { discordRequest as api, assertOutpostIdentity } from "./discord-client.mjs";

const user = await api("GET", "/users/@me");
const application = await api("GET", "/applications/@me");
assertOutpostIdentity(user, application);
const summary = (u, a) => ({
  applicationId: a.id,
  applicationName: a.name,
  botName: u.username,
  avatar: u.avatar,
  icon: a.icon,
  description: a.description,
  tags: a.tags,
  flags: a.flags,
  publicBot: a.bot_public,
  botRequiresCodeGrant: a.bot_require_code_grant,
  redirects: a.redirect_uris || [],
  installParams: a.install_params,
  integrationTypes: a.integration_types_config,
  customInstallUrl: a.custom_install_url || null,
  interactionsConfigured: !!a.interactions_endpoint_url,
  linkedRolesConfigured: !!a.role_connections_verification_url,
  eventWebhooksStatus: a.event_webhooks_status,
});
mkdirSync(".qa/discord", { recursive: true });
const before = summary(user, application);
if (process.argv.includes("--apply")) {
  writeFileSync(`.qa/discord/before-${Date.now()}.json`, JSON.stringify(before, null, 2), {
    mode: 0o600,
    flag: "wx",
  });
  const file = readFileSync("docs/assets/outpost-discord-avatar.png");
  if (file.length > 8 * 1024 * 1024 || file.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
    throw Error("Expected a bounded PNG avatar.");
  const image = `data:image/png;base64,${file.toString("base64")}`;
  if (!user.avatar || process.argv.includes("--replace-avatar"))
    await api("PATCH", "/users/@me", { avatar: image });
  await api("PATCH", "/applications/@me", {
    icon: image,
    description:
      "Your Albion Online companion for builds, market insights, crafting calculations and guild planning.",
    tags: ["Albion Online", "Gaming", "Tools", "Community"],
    // The official Discord API schema explicitly permits null to clear install links.
    install_params: null,
    custom_install_url: null,
    event_webhooks_status: 1,
  });
  // Public application ID is safe configuration. The bot token remains management-only.
  const localPath = ".env";
  const local = readFileSync(localPath, "utf8");
  const values = parseEnv(local);
  if (!values.DISCORD_CLIENT_ID && !values.DISCORD_CLIENT_SECRET)
    writeFileSync(
      localPath,
      local.replace(/^DISCORD_CLIENT_ID=.*$/m, `DISCORD_CLIENT_ID=${application.id}`),
      { mode: 0o600 },
    );
}
const after = summary(await api("GET", "/users/@me"), await api("GET", "/applications/@me"));
if (
  process.argv.includes("--apply") &&
  (!after.avatar ||
    !after.icon ||
    after.description !==
      "Your Albion Online companion for builds, market insights, crafting calculations and guild planning.")
)
  throw Error("Discord profile changes were not confirmed by read-back.");
const report = {
  checkedAt: new Date().toISOString(),
  mode: process.argv.includes("--apply") ? "applied-and-read-back" : "status",
  ...after,
  loginScopesInCode: ["identify", "email"],
  botTokenInAppRuntime: false,
  sentMessages: false,
  installedInServers: false,
  remainingPortalOnly: [
    ...(!after.redirects.includes("https://albionoutpost.com/api/auth/callback/discord")
      ? ["OAuth2 production redirect"]
      : []),
    "OAuth2 Client Secret",
    "Public Bot toggle",
  ],
  oauthVerified: false,
};
writeFileSync(".qa/discord/setup-result.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
