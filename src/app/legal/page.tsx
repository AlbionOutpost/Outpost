export const dynamic = "force-dynamic";
export default function Legal() {
  return (
    <div className="support-legal">
      <nav className="legal-contents" aria-label="Legal contents">
        <strong>On this page</strong>
        <a href="#operator">Operator information</a>
        <a href="#data-sources">Data sources</a>
        <a href="#scene-artwork">Scene artwork</a>
        <a href="#media">Typography & media</a>
        <a href="#privacy">Privacy policy draft</a>
      </nav>
      <article className="prose">
        <h1>Project, privacy & sources</h1>
        <p>
          Outpost is an independent fan project, not affiliated with or endorsed by Sandbox
          Interactive. Albion Online belongs to its respective owners.
        </p>
        <h2 id="operator">Operator information</h2>
        <p>
          {process.env.OPERATOR_NAME ||
            "REQUIRES COMPLETION BEFORE PUBLIC DEPLOYMENT: operator name"}
        </p>
        <p>{process.env.OPERATOR_ADDRESS || "Operator postal address not configured."}</p>
        <p>{process.env.OPERATOR_EMAIL || "Operator contact email not configured."}</p>
        <h2 id="data-sources">Data sources</h2>
        <p>
          Market observations:{" "}
          <a href="https://www.albion-online-data.com/api/">
            Albion Online Data Project public API
          </a>
          . Prices are player-contributed observations, not guaranteed live offers. Community builds
          and guides retain their named authors. Check update dates and confirm current game balance
          before relying on a recommendation.
        </p>
        <h2 id="scene-artwork">Scene artwork</h2>
        <p>
          Retained environment and party scenes are AI-generated illustrations created for Outpost
          with the user’s express authorisation. These illustrations are archived; the current
          homepage uses a neutral CSS atmosphere. They are not actual Albion Online gameplay
          screenshots, official promotional images or representations of verified equipment builds.
          Genuine item icons continue to come from Sandbox Interactive’s renderer. Generated scenes
          do not replace game data or item artwork.
        </p>
        <h2 id="media">Typography & media</h2>
        <p>
          Barlow Condensed, Inter and Geist Mono are self-hosted fonts used under the SIL Open Font
          License. License notices:{" "}
          <a href="/licenses/barlow-condensed-OFL.txt">Barlow Condensed</a>,{" "}
          <a href="/licenses/inter-OFL.txt">Inter</a> and{" "}
          <a href="/licenses/geist-mono-OFL.txt">Geist Mono</a>. Browsers make no font requests to
          an external provider. No environment screenshots or promotional backgrounds are bundled
          without recorded source and permission information.
        </p>
        <h2 id="privacy">Privacy policy draft</h2>
        <p>
          Discord authentication stores account identifiers, profile details, email and database
          session records. Session cookies are necessary for authentication. Theme and region
          preferences use first-party preference cookies. Public calculators do not require an
          account. No advertising or analytics cookies are implemented.
        </p>
        <p>
          The hosted preview uses Cloudflare Workers, D1 for public item and content data, and
          SQLite-backed Durable Objects for account and collaboration records. A signed, temporary
          routing cookie coordinates page requests; Discord controls your account login. Public
          artwork and fonts are served as static assets. No R2 upload service is currently enabled.
        </p>
        <p>
          The operator must establish the legal basis, retention schedule, hosting providers,
          controller contact, data subject request process and supervisory authority information
          before public operation. Authenticated users can export their stored profile and builds,
          or permanently delete their account, from Settings. This draft is not legal advice or a
          completed compliance assessment.
        </p>
      </article>
    </div>
  );
}
