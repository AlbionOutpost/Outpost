# Search discovery and social sharing

Implemented locally on 4 November 2026; canonical, sitemap and library-page signals tightened on 9 November after the first Search Console coverage report. Search-engine ownership, indexing, ranking and social-platform cache refreshes are external states; this implementation does not establish them.

## Metadata and discovery

`src/lib/seo.ts` supplies the Outpost title template, route-specific descriptions, absolute HTTPS canonicals, Open Graph and Twitter large-image metadata. The root has no inherited homepage canonical. The 25 public hub/tool routes in `publicPages` identify their own route; `/compositions` is Comps by activity, and its list (`?view=all` or any list filter) has its own title, with `view=all` kept in the canonical. Guides, archived builds/compositions, active catalog items and currently published authored builds/standalone compositions also have entity-specific share titles and descriptions.

The operator's optional `OUTPOST_PUBLIC_URL` selects the origin, defaulting to `https://albionoutpost.com`; request Host and session state never choose it. Canonical paths reject backslashes, control characters, spaces, embedded queries/fragments and cross-origin resolution.

**Canonical rule (9 Nov 2026).** Every indexable page names itself without any query that does not make it a different page (`canonicalUrl` in `src/lib/seo.ts`). The canonical keeps only:

| Kept                                                               | Why                                                             |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| `source` and a known `category` on `/builds`, `/compositions`      | Own list with its own title (activity pages are in the sitemap) |
| `view=all` on `/compositions`, `view=deaths` on `/tools/kill-feed` | Another page with its own title                                 |
| `page` ≥ 2 on `/builds`, `/compositions`, `/guides`, `/items`      | Pagination stays self-canonical (Google's guidance)             |

Everything else is dropped: `?region=` (the same page with another server's numbers), Market `item`/`quality`, `weapon`/`family`/`tag` list filters (they canonicalise to the list they narrow), `sort` and `view` layout switches, tracking and account inputs. Personal `mine=1`, saved views and nonempty `q` variants are noindex/nosnippet.

**Links name the region only off Europe.** Europe is what a page renders with no `?region=` and no `atlas-region` cookie, and the region picker writes the cookie, so `withBuildRegion`/`regionSuffix` (`src/lib/build-region.ts`) leave `?region=europe` off internal links (shell navigation, build/comp/guide/item links, tool directory, homepage). Before, every link carried it, so crawlers met `?region=europe` copies of every page: duplicates, and on archived builds and items, URLs robots.txt blocks (the 1,645 "Blocked by robots.txt" in Search Console on 9 Nov). Market deep links (`/tools/market?region=…&item=…`) still carry it; their canonical is `/tools/market`.

**Library build pages.** A library build is indexable when at least one player liked it (`indexedBuild` in `src/lib/library-scope.ts`, 2,762 of 10,770). Unliked builds, mostly scratch copies, render `noindex, follow` with no canonical; they stay reachable for the comps that link them. Titles read "Title — Weapon build for Activity" unless the author's title already names the weapon; the description and, when the author left no notes, the visible header are one sentence built from the build's own fields (weapon, activity, author, gear names), followed by the author's notes. Comp titles add the activity the same way.

The static 1200×630 `/brand/outpost-social.png` (palette PNG, about 310 KB) gives links a consistent branded image, with page-specific title/description in metadata. Entity-specific images and remote avatar fetching are not implemented. [Asset provenance and hashes](assets/OUTPOST_SOCIAL_IMAGE.json) record the existing owner-supplied logo, existing generated decorative scene and brand fonts. The scene is not official Albion artwork or gameplay evidence. The optional `scripts/build-social-image.mjs` uses local dependencies and normally sandboxed Playwright; production serves the committed PNG without runtime image generation or remote image-fetch costs.

`scripts/build-sitemap.ts` runs in both regular and Cloudflare builds and writes static `/sitemap.xml` with only indexable pages under their own canonical: public hubs/tools, activity lists that have at least one listed build (27 of 32), guides, liked library builds and all archived comps. Local output contains **3,528 absolute URLs** (11,542 before 9 Nov 2026: unliked builds and five empty activity lists are gone). The script fails the build if a listed URL matches a robots.txt `Disallow` rule, a noindex or redirecting route family (account, editor, Team, profile, `/legal`, `/premium`, `/supporter`, `/tools/death-feed`, the old `/builds/library` list, `q`/`mine`/`region`/`view=saved` queries), or names another canonical; `tests/seo.test.ts` checks the same on a fixture. New authored public records have share metadata and public hub links; they are not enumerated by this immutable-archive build-time sitemap.

`public/robots.txt` (written at build time by `scripts/build-sitemap.ts`, a static file so crawls cost no Worker CPU) exposes the absolute sitemap and retains private/editor/API crawl exclusions. It also keeps crawlers off duplicate URLs (search results, the build list's `view=` switch, any query on archived build, comp and item pages). Editor rules end in `$` or `?` (`/builds/*/edit$`), so a library slug that starts with "edit" is not blocked and disallows the backlink crawlers AhrefsBot, SemrushBot, MJ12bot and DotBot. Robots rules are crawl/indexing signals, never authorization. A blocked URL may remain known to a search engine, and a crawler blocked from fetching cannot observe a new noindex directive. Previously indexed restricted URLs need operator URL inspection/removal handling when applicable.

## Search Console coverage, 9 Nov 2026

The first coverage report (sitemap read 8 Nov, 11,542 URLs) showed 3,332 indexed and 7,325 not indexed. What each group came from and what changed:

| Group                                                                           | Cause found                                                                                                                | Change                                                                                                    |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Blocked by robots.txt (1,645)                                                   | Every internal link carried `?region=europe`; robots blocks any query on archived build, comp and item pages               | Links omit the default region; robots unchanged                                                           |
| Duplicate without user-selected canonical (420)                                 | `?region=` copies of hubs and lists named themselves canonical, with the region                                            | Canonicals drop region, filters, Market item and switches                                                 |
| Excluded by noindex (1,277)                                                     | Not identified URL by URL; candidates are personal views (`mine=1`, `view=saved`), Teams, player profiles, private records | None needed: these are correct; none is in the sitemap                                                    |
| Crawled, currently not indexed (3,371)                                          | Mostly thin library builds: title without weapon or activity, empty description, many unliked scratch copies               | Unliked builds noindex and out of the sitemap; richer titles/descriptions                                 |
| Page with redirect (50), not found (3)                                          | Old `/builds/library` list URLs, `/premium`, `/tools/death-feed`, `www`; `/legal` while unpublished                        | No internal link points at them; "All of them" now uses `weapon=` instead of a robots-blocked `q=` search |
| Alternate page with proper canonical (525), Google chose another canonical (34) | Expected for query variants                                                                                                | —                                                                                                         |

Owner follow-up: resubmit the sitemap after deploy and watch the noindex group grow by the unliked builds Google had indexed, while "Crawled, currently not indexed" shrinks.

## Structured data, icons and manifest

`src/lib/structured-data.ts` builds JSON-LD; `src/components/json-ld.tsx` renders it server-side with `<` escaped. `application/ld+json` is a data block, so the nonce-based `script-src` neither blocks nor needs to allow it. The root layout emits `Organization` + `WebSite` on `/` only (no `SearchAction`: Outpost has no indexable search-results URL, and `?q=` variants are noindex) and a `BreadcrumbList` for reviewed nested public routes such as `/tools/market`, using the `x-outpost-path` header that `src/proxy.ts` overwrites on every request. Guide pages add `Article` plus breadcrumbs, `/guides` adds an `ItemList`, and archived build, group build and item pages add breadcrumbs. Authored (user) pages emit none.

`src/app/manifest.ts` serves `/manifest.webmanifest` (name, short name, `#0b1016` theme/background, 192 and 512 icons plus a maskable 512, all in `public/`). The root `viewport` export sets `theme-color` and `color-scheme`. `favicon.ico`, `icon.png` and `apple-icon.png` stay in `src/app`. Every icon is cut from the owner's painted banner (`public/brand/outpost-mark.png`, the same banner as the wordmark); always use that logo, never a redrawn one. `/legal` declares `en`/`de`/`x-default` alternates for its `?lang` pair; it stays noindex while operator details are incomplete.

`e2e/accessibility.spec.ts` runs axe (WCAG 2.0 to 2.2 A/AA tags) on 16 main public pages at 1440 and 390 and fails on serious or critical findings, and checks one `h1` and one `main` per page.

Not done: per-entity Open Graph images. The static card is used everywhere; `ImageResponse` would add Worker CPU/size cost on the Free tier and was not verified on the OpenNext build.

## Public-only share resolver

`src/lib/seo-public.ts` is server-only, never reads cookies/sessions/viewer permissions and adds no shared metadata cache. It uses existing public archive resolvers or fresh minimal anonymous authored-record queries.

| Record/state                                                                 | Metadata behavior                                                                                                    |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Build currently `PUBLIC`, `hiddenAt: null`                                   | Public title/description, own canonical and static brand image                                                       |
| Standalone composition currently `PUBLIC`, `hiddenAt: null`, `groupId: null` | Public title/description and own canonical                                                                           |
| Private, unlisted, hidden, deleted or missing record                         | Generic unavailable head; no entity/author fields or canonical; noindex/nofollow/nosnippet/noimageindex              |
| Any group-bound composition, including a mismatched public DTO               | Generic restricted head; no Team name, notes or membership context                                                   |
| Owner viewing an authorized private body                                     | Body keeps existing permissions; share head stays generic/restricted                                                 |
| Public visibility revoked                                                    | Fresh metadata query denies prior title; external cached social previews cannot be synchronously revoked by this app |
| Inactive/missing/mismatched catalog item DTO                                 | Generic unavailable metadata without unreleased/unrelated name                                                       |
| Account/editor/sign-in/invitation/admin/Team/player profile route            | Generic metadata and noindex/nosnippet; authorization remains authoritative                                          |

Only minimal public fields are selected; no author email, session token, private notes or remote avatar. Returned visibility/null guards are checked again. Public text is bounded, stripped of markup/control characters and escaped by React/Next. These metadata checks supplement route authorization and do not grant access to any body.

## Verification setup and owner steps

`GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` are optional **public ownership tokens**, not OAuth/API credentials. Empty entries are documented in `.env.example`; metadata emits Google verification and Bing `msvalidate.01` tags only when configured. Neither was configured at the local audit (presence only, no values recorded). No verification token was invented and no Search Console/Bing account was accessed.

Set the matching optional GitHub environment **variables** in `cloudflare-production`. The deployment workflow passes them into the build and `scripts/cloudflare-release-config.mjs` forwards valid bounded tokens into Worker `vars`; absent/malformed values are omitted. The current Node compatibility/date configuration supports process.env population. Isolated fixture tests prove forwarding and omission without reading owner runtime credentials. Redeploy after changing variables, then check the actual live head. Manual local release configuration also accepts these process environment variables. Do not copy secrets into public config or documentation.

Remaining external owner actions:

1. Add/select the correct Search Console property. A Domain property normally uses the exact DNS record Google supplies; a URL-prefix property may use the supported HTML tag and exact owner-provided token. This document does not authorize DNS changes or provide a verification value.
2. Verify ownership and submit `https://albionoutpost.com/sitemap.xml`. Check the deployed sitemap and public pages are retrievable.
3. Inspect representative homepage, regional Market, activity library, guide and explicitly published build/composition URLs. Check crawl/indexability and Google-selected canonical; request indexing selectively when useful.
4. Inspect previously indexed restricted/draft/redirect URLs if any and use the service's supported remediation. Social previews can remain cached until platforms refresh them.
5. Monitor crawl/indexing reports. Metadata and sitemaps cannot guarantee indexing, rank, rich results or a particular social-platform presentation.

## Verification and limits

- Node 22 `npx vitest run tests/seo.test.ts`: **73 passed** (9 Nov 2026). Route/query identity, malformed canonical paths, optional verification, PNG dimensions, anonymous public-only queries, visibility/group/adapter denial, revocation and generated sitemap/Worker config fixtures.
- Node 22 `npm run typecheck`: **passed** after the final test-only child-process environment typing correction. Parent mandatory phase remains release authority.
- `e2e/seo.spec.ts`: **2 passed** on the local dev server; latest rerun 1.4s. Actual browser Market canonical/OG/Twitter; Twitterbot blocking head for an archived build; PNG HTTP 200/MIME/1200×630; actual sitemap/robots; isolated local PUBLIC build/composition success; private/unlisted/hidden/Team denial; fixture owner private body with generic head; public-to-private revocation. Evidence: `.qa/seo/e2e.log` and standard Playwright report.
- Static PNG visually inspected at native resolution: legible owner logo, charcoal/copper typography and decorative scene, without private/user fields.
- Sitemap fixture tests verify unique absolute same-origin URLs, no credentials/fragments, known category queries only and private/editor/draft/redirect family exclusions.

Fixture sessions are local test evidence, not real Discord OAuth. No production entity writes, Search Console ownership, Google index state or remote social-cache behavior are claimed. Integration build, Cloudflare runtime checks, mandatory major-phase QA and post-release public readback are separate gates.

## Primary references

Implementation used the installed Next 16.4.3 metadata/OG/robots guides, including async page parameters and blocking heads for HTML-limited bots.

- [Next metadata and Open Graph](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Google canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google robots metadata](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Search Console ownership](https://support.google.com/webmasters/answer/9008080), [URL inspection](https://support.google.com/webmasters/answer/9012289) and [recrawl requests](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Open Graph protocol](https://ogp.me/)
- [Cloudflare Worker variables](https://developers.cloudflare.com/workers/configuration/environment-variables/) and [process.env](https://developers.cloudflare.com/workers/runtime-apis/nodejs/process/)
