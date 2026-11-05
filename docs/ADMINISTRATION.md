# Administration

The administrative workspace starts at `/admin`. The account menu and Settings link to it for a current global `ADMIN`. A `MODERATOR` retains `/admin/reports`; it cannot manage accounts, gifts, bans, charts or the administrative audit. Global roles are distinct from a Team's similarly named roles.

## What is available

- **Overview:** registered accounts, current Supporter entitlements, open reports, banned registered accounts, stored builds/comps/Teams and unexpired sessions. A 30-day UTC chart switches between newly created accounts, builds and comps; pointer inspection, a keyboard/touch day slider and a daily HTML table expose its values. These are database records, not visitors, active players, revenue or unique people. The newest5,000 events per series are the maximum chart sample; a visible notice discloses truncation. Overview counts are counted separately without that cap.
- **Users:**20 per page, search by name/full Discord ID/full internal account ID, plus Supporter/reported/banned filters. Details show current entitlements, recorded email, content/session counts, review signals and the latest20 relevant administrative actions. Search/filter URLs remain private; lists do not return OAuth tokens, session tokens or billing customer identifiers.
- **Review:** manual triage for accounts with open content reports, at least8 unexpired sessions, or accounts created within24hours that posted at least20comments during that period. Candidate groups are bounded at100 per activity signal;50 accounts are displayed, with a truncation notice where applicable. Reports are allegations. Signals do not prove abuse or automatically ban anyone. No IP tracking, fingerprints or invented fraud scores were added.
- **Supporter gifts:**30/90/365days or until revoked, with a reason. A new gift replaces the previous gift's expiry rather than adding time. Gifts are independent of Stripe subscriptions; revoking a gift does not remove paid benefits, charge anyone or cancel billing. Expiry is evaluated when access is checked; no scheduled job is required. Gifts appear in Settings, Supporter benefits, exports, advertising suppression and Team entitlement checks. Existing billing-disabled gate behavior is preserved.
- **Account security:** revoke a regular account's sessions; ban a numeric Discord identity for7/30days or until revoked; restore access. Ban confirmation requires typing the exact action and ID. A ban prevents sign-in to **Outpost**, not Discord itself. It preserves content, does not cancel an existing subscription and does not automatically change Team ownership. Handle billing/support/owned-Team consequences deliberately. Owner/administrator accounts are protected from this interface's bans and session revocation.
- **Audit:**25 entries per page, with actor identifier, target identifier, time, action and reason. No application edit/delete endpoint exists. Moderation's content-review audit remains its own existing store. Administrative reasons must not contain secrets or unnecessary personal data.

## Access and mutation boundaries

| Actor                            | Overview/users/review/audit | Reports                 | Gift/revoke sessions/ban                   |
| -------------------------------- | --------------------------- | ----------------------- | ------------------------------------------ |
| Anonymous/expired/banned session | Sign-in required; API401    | Sign-in required        | Denied                                     |
| Ordinary user                    | Page404; API403             | Denied                  | Denied                                     |
| Global MODERATOR                 | Page404; API403             | Allowed by current role | Denied                                     |
| Global ADMIN                     | Allowed by current role     | Allowed                 | Allowed, with protected-account exclusions |
| Team OWNER/ADMIN alone           | No global authority         | No global authority     | No global authority                        |

Discord identity comes from the existing OAuth provider exchange with PKCE/state and the configured issuer. The verified configured owner ID can receive the global ADMIN role server-side. No role-assignment endpoint was added; supplying a Discord ID, role header, user ID or forged cookie does not create a valid session. The session callback does not trust browser role claims.

Every new mutation uses the existing authenticated, exact-Origin and per-account rate boundary, an8KiB JSON limit and a strict schema. Extra role/payment fields fail validation. User writes require the displayed account revision; identity bans require the displayed ban version. Stale changes return409 rather than overwriting another administrator. Current ADMIN authority is rechecked **inside** the same serializable/retried transaction as the state change and audit insertion. Existing public/private cache boundaries remain unchanged; admin API responses are `private, no-store`, and pages are private/noindex.

Ban state is checked before sign-in, during atomic session creation and on current-session resolution. Session creation serializes with bans, covering the account-creation/sign-in race. Banning and unbanning delete all linked sessions. A denied or expired session is removed when encountered; an old token cannot become usable again when a ban expires. A newly issued session is required after access returns. Revoking sessions does not invalidate a request that already authenticated before the revocation committed.

Persistent `DiscordBan` identities survive account deletion to prevent deletion/recreation from evading a ban. Minimal `AdminAudit` actor/target identifiers and reasons also survive deletion. Neither table has an automatic retention/purge job. Operator/legal retention decisions remain open and are explicitly disclosed in the EN/DE draft legal copy; these implementation notes do not establish legal approval.

## Data upgrade and recovery

PostgreSQL migration `20261105010000_admin_controls` is additive. SQLite migration `0008_admin_controls.sql` adds the same account fields and tables; the private database Worker upgrades schema6 to **7** transactionally. Existing historical migrations are retained. The public D1 catalog and imported game facts are unchanged.

Deploy the schema7 data Worker before the matching web Worker, as the normal protected pipeline does. **Never roll back the private data Worker to schema6 after the upgrade.** Roll forward with a compatible fix. Older web code can read the additive schema, but pre-admin web code does not enforce the new bans; database compatibility alone is therefore insufficient for a secure rollback after bans are in use. Retain matching session/ban enforcement or use a controlled maintenance/roll-forward response. No production backup or restore drill is established by the local upgrade tests.

Local verification includes preserved-row SQLite upgrades/rollback/restore, PostgreSQL migrations/backup/restore, seven atomic admin/session scenarios, negative role/Origin/revision tests, the real local Worker transport and browser journeys. Fixtures are isolated local users, not real Discord OAuth, real payments or real customer actions. See [design and acceptance evidence](design/ADMIN_PLATFORM_2026-11-05.md).

The release configuration passes the same reviewed owner ID to both Workers; the binding-only backend protects it even before a user exists. The runtime test uses an isolated synthetic owner ID and asserts that an attempted pre-account ban fails without creating a ban. With the pinned compatibility date and Node compatibility, configured text bindings populate `process.env` as described in the [Cloudflare runtime documentation](https://developers.cloudflare.com/workers/runtime-apis/nodejs/process/). No management token is placed in either runtime.
