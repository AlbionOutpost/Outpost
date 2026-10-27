# Private GitHub setup

Status 2026-10-26: the owner created **AlbionOutpost**. Authenticated `oNxZero` has active owner membership and `admin:org`, `repo` and `workflow` scopes. Both repositories exist, are private and empty. No application files, secrets or Git history have been uploaded. Latest policy read-back evidence is retained locally in `.qa/github-live/`.

## Repositories and automated policy

- [AlbionOutpost/outpost](https://github.com/AlbionOutpost/outpost): existing application monorepo.
- [AlbionOutpost/outpost-operations](https://github.com/AlbionOutpost/outpost-operations): future deployment configuration and runbooks; never credentials.

`scripts/github-setup.mjs` applies policies only after verifying the organization identity and active owner membership. Run on Node 22:

```bash
node scripts/github-setup.mjs
node scripts/github-setup.mjs --apply
```

The default invocation reads and plans. Apply is repeatable, with read-back checks after writes; it is not transactional. A failure can leave earlier policies applied and must not be reported as complete.

Automated controls:

- Default member repository permission none; members cannot create repositories or Pages sites, or fork private repositories.
- Both repositories private; forks disabled, squash merges only, automatic merges disabled, merged branches deleted, wiki and projects disabled.
- Organization Actions restricted to the two selected repositories. Organization and repository policies allow only `actions/checkout` and `actions/setup-node`, with full commit SHA pinning required; verified-creator and general GitHub-owned allowances disabled.
- Default workflow tokens read-only, automated PR approvals disabled, private fork PR workflows disabled with no write tokens or secrets. Reusable workflow access from other repositories is disabled.
- Workflow logs/artifacts retained 14 days. External contributors require approval for fork workflows at organization level.
- Dependabot alerts and automated security fixes enabled and checked. Weekly version-update proposals are prepared in local `.github/dependabot.yml`; they are not active until uploaded. No automatic dependency merging.

GitHub rejects the internal-repository creation field on this Free organization, even when false. It also rejects a repository `allow_forking:false` update when the organization already forbids private forks; the script relies on and verifies the effective ban. Read-only fields for member visibility changes, deletion and collaborator invitations are explicitly reported as manual controls rather than silently claimed applied.

## Required website settings

These controls remain open after API provisioning:

1. [Organization authentication security](https://github.com/organizations/AlbionOutpost/settings/security): require two-factor authentication. Currently only `oNxZero` is a member and there are no outside collaborators. Use strong MFA/passkeys and retain recovery codes privately.
2. [Member privileges](https://github.com/organizations/AlbionOutpost/settings/member_privileges): restrict repository visibility changes, deletion/transfers and outside-collaborator invitations to organization owners. Their readable API values remain enabled; the REST organization update endpoint does not expose corresponding writable fields.
3. Private branch protection/rulesets are **BLOCKED on the current GitHub Free plan**. GitHub returns HTTP 403 with an upgrade requirement. Both repositories remain private; no paid plan is purchased. Do not treat PR reviews or required CI checks as enforced until an eligible plan is intentionally enabled and rules are read back successfully.

The organization's profile/name is not private merely because its repositories are private. No fake second owner, account conversion, paid security product or billing change is performed.

## Remaining verification

GitHub secret scanning/push protection is not enabled or certified. Private security-product eligibility and a monitored private reporting channel remain unresolved. There is no source history here to scan, no hosted CI run and no deployed application. Organization webhooks could not be inspected because the token lacks `admin:org_hook`; no extra scope was requested merely to expand this audit. Initial organization secrets and self-hosted runners were both empty.

Before application upload, establish the intended Git history, run maintained source/history secret scanning, inspect exclusions and exact staged paths, and validate a fresh checkout. Do not blindly stage the entire workspace. The provisioning script never initializes Git, commits, uploads code, deploys, or enables paid products. Hosted Actions remains unverified while repositories are empty. Ten API fixture tests cover owner gating, public-repository refusal, SHA drift, organization-first policy ordering and bounded repository-selection propagation. Local fixture sessions are not real OAuth; public release remains NO-GO.

API references: [organization settings](https://docs.github.com/en/rest/orgs/orgs), [repository settings](https://docs.github.com/en/rest/repos/repos), [Actions policies](https://docs.github.com/en/rest/actions/permissions). [Private ruleset availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets) and [organization MFA](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-two-factor-authentication-for-your-organization/requiring-two-factor-authentication-in-your-organization).
