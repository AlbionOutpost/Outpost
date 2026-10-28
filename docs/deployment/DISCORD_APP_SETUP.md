# Discord Developer Portal settings for Albion Outpost

These settings match the actual website integration in `src/lib/auth.ts`: confidential server-side authorization-code login, state + PKCE, database sessions and only `identify email`. No Discord commands, Gateway connection, server-membership sync, message sending or bot worker are implemented. The application may have a bot identity; its bot token is not used by this website.

## Current application: already configured

The owner supplied the existing **Outpost** application’s bot credential. API reads verified application1564994799722045560 and a matching real bot before writes. Both the application icon and bot avatar now use the generated banner; description/tags are set. The public install link was cleared using the nullable fields in Discord’s official API schema. Privileged intent flags are zero, bot Code Grant is off, interactions/linked roles are unconfigured, and the production callback is already correct. The existing Outpost name was preserved.

`DISCORD_CLIENT_ID` is configured locally from the verified application ID. The bot credential is isolated in owner-only `.env.discord`, outside application runtime. The owner supplied the OAuth Client Secret and completed the portal-only settings. Both exact callbacks are now verified, Public Bot is off, and the credential pair is saved together in owner-only local `.env`. These fields were not edited/retrieved through the bot-token endpoint. Real user consent, session lifecycle and deployed Secure-cookie checks remain unverified. The detailed guide below is a reference; do not create another application or repeat the completed uploads.

The first empty-install-scopes request returned400/50035. The official API schema permits `install_params` and `custom_install_url` to be null; using those supported values cleared the link and was read back. No permission rejection, user-account automation, message send or server invitation was bypassed/performed. [Official Discord API schema](https://github.com/discord/discord-api-spec/blob/main/specs/openapi.json).

Open [Discord Developer Portal](https://discord.com/developers/applications), choose **New Application**, name it **Albion Outpost**, then configure the following. Existing applications can use the same values without resetting working credentials.

## General Information

| Field                             | Value                                                                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                              | `Albion Outpost`                                                                                                                                                                                                 |
| App icon                          | Upload [the generated square banner avatar](../../public/brand/outpost-discord-avatar.png). Keep the ivory emblem centered when cropping. The original website wordmark is preserved.                            |
| Description                       | `Your Albion Online companion for builds, market insights, crafting calculations and guild planning.`                                                                                                            |
| Tags                              | `Albion Online`, `Gaming`, `Tools`, `Community` where accepted; optional, not login permissions.                                                                                                                 |
| Application ID                    | Copy into `DISCORD_CLIENT_ID` in the ignored local `.env`. This is also the OAuth2 Client ID.                                                                                                                    |
| Public Key                        | Leave the generated value alone. It verifies Discord interactions; it is not the Client Secret and is not required by current login.                                                                             |
| Interactions Endpoint URL         | Blank. Do not paste the OAuth callback here; there is no interactions endpoint yet.                                                                                                                              |
| Linked Roles Verification URL     | Blank.                                                                                                                                                                                                           |
| Terms of Service / Privacy Policy | Configure real public policies before launch. The current local `/legal` page still has incomplete operator information and is not a completed Terms of Service. Do not submit invented/unavailable policy URLs. |
| Support server / other metadata   | Optional; use only a real owned support server. No server invite is required for sign-in.                                                                                                                        |

Save changes.

## OAuth2

In **OAuth2 → General** (some portal layouts place these fields directly on OAuth2):

1. Copy **Client ID** into `DISCORD_CLIENT_ID` if not already saved.
2. Reveal/generate **Client Secret** and save it as `DISCORD_CLIENT_SECRET` in the ignored `.env`. Never substitute the bot token or Public Key. Do not reset an existing working secret unless rotating it intentionally.
3. Add the exact production redirect below. No wildcard, trailing slash or extra query parameters.
4. For local testing, add the exact localhost redirect separately. Keep the local app's `NEXTAUTH_URL=http://localhost:3000`; production must use the HTTPS origin.
5. If a **Public Client** switch is shown, leave it **OFF**: this server keeps a client secret. PKCE/state are already enforced in code.

```text
https://albionoutpost.com/api/auth/callback/discord
http://localhost:3000/api/auth/callback/discord
```

Save changes. The production canonical origin is the apex domain. Add a www callback only if the app is deliberately configured to authenticate on www; this deployment currently is not.

The website generates the authorization URL through NextAuth, with these scopes:

```text
identify
email
```

Scopes are requested by code; ticking URL Generator boxes does not configure the running website. The **OAuth2 URL Generator** is unnecessary for this login. If inspecting it, select only `identify` and `email`, and the matching redirect. Do not select `bot`, `applications.commands`, `guilds`, `guilds.join`, `guilds.members.read`, webhook or message scopes. No bot permission bitfield is needed. Start login from the website's Discord button rather than a manually shared generated URL, so state/PKCE cookies are created correctly.

## Installation

Set **Install Link → None**. This disables the public install/invite button; it does not disable website OAuth login. It also avoids the portal restriction on making a bot private while a default install link remains enabled.

User Install/Guild Install contexts and their Default Install Settings are for installable Discord apps, not the website login. With Install Link=None, leave contexts at their existing/default values; do not add install scopes or permissions. A future command/bot feature needs its own explicit settings and implementation.

## Bot

If a Bot page/identity is present:

| Field                      | Value                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Username                   | `Albion Outpost`                                                                                                      |
| Avatar                     | Upload the same generated banner avatar. Application and bot avatars may be separate upload fields.                   |
| Public Bot                 | **OFF** for the current private/uninstalled bot. This affects server installation, not who can sign into the website. |
| Requires OAuth2 Code Grant | **OFF**. This bot-installation toggle is separate from the website's authorization-code flow.                         |
| Presence Intent            | **OFF**                                                                                                               |
| Server Members Intent      | **OFF**                                                                                                               |
| Message Content Intent     | **OFF**                                                                                                               |
| Bot Permissions            | None / permission integer `0`; no Administrator or server permissions.                                                |
| Bot Token                  | Leave it unused. No token reset, copying or bot process is required for website login.                                |

## Other sections

Leave Activities, Rich Presence, monetization, linked-role metadata, app discovery, commands, event webhooks and webhook subscriptions unconfigured/disabled. None is required by this website. Developer-account MFA and account recovery should be configured on the owner's Discord account; MFA is separate from application scopes.

## Values in this project

For the local website:

```dotenv
DISCORD_CLIENT_ID=your_application_id
DISCORD_CLIENT_SECRET=your_oauth_client_secret
NEXTAUTH_URL=http://localhost:3000
```

Keep the existing `NEXTAUTH_SECRET`; do not copy any secret into a `NEXT_PUBLIC_` variable. The deployment will need its own strong secret and production `NEXTAUTH_URL=https://albionoutpost.com` in runtime secret configuration. The administration tokens in `.env.cloudflare` are never application/Discord credentials.

Both Discord values are now configured locally. Do not paste the Client Secret into chat. Local login additionally needs the localhost redirect above. The public deployment and OAuth start now verify the exact callback, state/PKCE and Secure/HttpOnly/SameSite pre-login cookies. Real personal consent/callback exchange, session reload, owner-admin assignment, logout/expiry and denied access from a second real account remain pending. Owner Discord ID303585687460904970 is configured server-side; only its persisted verified provider link receives ADMIN. Cloudflare Access is removed. An avatar upload or successful fixture session does not prove those checks.

## Sources and asset provenance

Checked28 October2026 against [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2), [application fields](https://docs.discord.com/developers/resources/application), [installation and intents](https://docs.discord.com/developers/quick-start/getting-started) and [private-bot/Install Link restrictions](https://support-dev.discord.com/hc/en-us/articles/21204493235991-How-Can-Users-Discover-and-Play-My-Activity). Bot-guide example command scopes are intentionally not part of this website's login.

The1254×1254 PNG is original AI-generated avatar artwork requested by the owner, matching the charcoal/copper/ivory brand. It is not official Albion artwork and does not replace the owner-supplied wordmark. [Provenance](../assets/OUTPOST_DISCORD_AVATAR.json). The owner-authorized bot/application profile changes above were applied and read back through the official API. No invitation, message, server installation or Gateway connection was performed.
