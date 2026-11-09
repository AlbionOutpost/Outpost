# Hollow Lantern site

The company website for Hollow Lantern, the studio behind Outpost. Plain HTML, one stylesheet and one small script, served from `hollowlantern.com`.

## Layout

| Path                       | What it is                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `public/`                  | Everything that is deployed, as is. No build step.                                    |
| `public/_headers`          | Security headers (CSP, HSTS and friends) and cache rules.                             |
| `public/assets/fonts/`     | Self-hosted Barlow Condensed and Inter, with their OFL licence files.                 |
| `public/impressum.html`    | Impressum (German).                                                                   |
| `public/datenschutz.html`  | Datenschutzerklärung (German).                                                        |
| `scripts/build-images.mjs` | Optional. Regenerates the favicon PNG/ICO, touch icon, grain and OG image.            |
| `wrangler.jsonc`           | Assets-only Worker `hollowlantern-site` (custom domains attached once in Cloudflare). |

The page loads nothing from third parties: no web fonts from a CDN, no analytics, no external images. Keep it that way; the CSP in `_headers` blocks anything else, and the Datenschutz text promises it.

## Run it locally

Any static server works, for example from this folder:

```sh
npx wrangler dev
```

`wrangler dev` also applies `_headers`, the `/impressum` URL handling and the 404 page, which a plain static server does not.

## Deploy

```sh
cd sites/hollowlantern
CLOUDFLARE_API_TOKEN=… npx wrangler deploy
```

A push to `main` that touches `sites/hollowlantern/` deploys it through `.github/workflows/hollowlantern-site.yml` with the existing Workers deploy token. `hollowlantern.com` and `www.hollowlantern.com` are attached as Workers Custom Domains once (not in `wrangler.jsonc`), so the token needs only Workers Scripts edit; `www` is 301-redirected to the apex by a zone Redirect Rule. The Worker has no script, so every request is a static-asset request: free on any plan, with no Worker invocations billed.

`www.hollowlantern.com` serves the same pages with a canonical link to the apex. To redirect it instead, add a Cloudflare Redirect Rule on the zone (free); an assets-only Worker cannot redirect by itself.

## Change images

The SVGs (`public/favicon.svg`, `public/assets/img/lantern.svg`) are the sources. After editing them, run from the repo root (needs `npm ci` there for sharp and Playwright):

```sh
node sites/hollowlantern/scripts/build-images.mjs            # icons, grain, og.jpg
node sites/hollowlantern/scripts/build-images.mjs --outpost  # also recapture the Outpost screenshot
```

Images under `/assets/img/` and fonts are cached for a year as immutable, so give a changed file a new name and update the references.

## Before launch

- Get the Impressum and Datenschutz texts a legal review.
- Contact goes to `contact@albionoutpost.com` until a `hollowlantern.com` mailbox exists; update `index.html`, `impressum.html` and `datenschutz.html` together.
- The Outpost counts on the home page are dated (9 November 2026). Update or remove them when they go stale.
