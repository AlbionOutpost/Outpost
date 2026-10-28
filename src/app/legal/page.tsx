export const dynamic = "force-dynamic";
export default function Legal() {
  return (
    <article className="panel prose">
      <div className="eyebrow">TRANSPARENCY</div>
      <h1>Project, privacy & sources</h1>
      <p>
        Outpost is an independent fan project, not affiliated with or endorsed by Sandbox
        Interactive. Albion Online belongs to its respective owners.
      </p>
      <h2>Operator information</h2>
      <p>
        {process.env.OPERATOR_NAME || "REQUIRES COMPLETION BEFORE PUBLIC DEPLOYMENT: operator name"}
      </p>
      <p>{process.env.OPERATOR_ADDRESS || "Operator postal address not configured."}</p>
      <p>{process.env.OPERATOR_EMAIL || "Operator contact email not configured."}</p>
      <h2>Data sources</h2>
      <p>
        Market observations:{" "}
        <a href="https://www.albion-online-data.com/api/">Albion Online Data Project public API</a>.
        Prices are player-contributed observations, not guaranteed live offers. The Grind library
        restores the operator’s previously owned public builds, compositions and guides, preserving
        authors and the archive date. Historical selections are not verified as current meta. No
        invented combat statistics are distributed. Item icons are requested from Sandbox
        Interactive’s public render service. These image requests disclose your IP address to the
        render host. When direct artwork loading fails, Outpost uses its bounded server-side image
        cache or an original neutral fallback. Artwork remains the property of its respective
        owners.
      </p>
      <h2 id="scene-artwork">Scene artwork</h2>
      <p>
        Retained environment and party scenes are AI-generated illustrations created for Outpost
        with the user’s express authorisation. The market illustration is used as a small homepage
        vignette and muted background; the other three scenes remain archived. They are not actual
        Albion Online gameplay screenshots, official promotional images or representations of
        verified equipment builds. Genuine item icons continue to come from Sandbox Interactive’s
        renderer. Generated scenes do not replace game data or item artwork.
      </p>
      <h2>Typography & media</h2>
      <p>
        Barlow Condensed, Inter and Geist Mono are self-hosted fonts used under the SIL Open Font
        License. License notices: <a href="/licenses/barlow-condensed-OFL.txt">Barlow Condensed</a>,{" "}
        <a href="/licenses/inter-OFL.txt">Inter</a> and{" "}
        <a href="/licenses/geist-mono-OFL.txt">Geist Mono</a>. Browsers make no font requests to an
        external provider. No environment screenshots or promotional backgrounds are bundled without
        recorded source and permission information.
      </p>
      <h2>Privacy policy draft</h2>
      <p>
        Discord authentication stores account identifiers, profile details, email and database
        session records. Session cookies are necessary for authentication. Theme and region
        preferences use first-party preference cookies. Public calculators do not require an
        account. No advertising or analytics cookies are implemented.
      </p>
      <p>
        The hosted preview uses Cloudflare Workers, D1 for public item and archive data, and
        SQLite-backed Durable Objects for account and collaboration records. A signed, temporary
        routing cookie coordinates page requests; Discord controls your account login. Public
        artwork and fonts are served as static assets. No R2 upload service is currently enabled.
      </p>
      <p>
        The operator must establish the legal basis, retention schedule, hosting providers,
        controller contact, data subject request process and supervisory authority information
        before public operation. Authenticated users can export their stored profile and builds, or
        permanently delete their account, from Settings. This draft is not legal advice or a
        completed compliance assessment.
      </p>
    </article>
  );
}
