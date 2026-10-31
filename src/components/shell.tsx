"use client";
import Link from "@/components/link";
import { Suspense, useState, useRef, useEffect } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, X, Sun, Moon, ChevronDown, ArrowUpRight, Grid2X2 } from "lucide-react";
import { DiscordMark } from "./discord-mark";
import { LogoutButton } from "./login-button";
import { ToolIcon } from "./tool-icon";
import { tools } from "@/lib/tool-directory";
import { GlobalSearch } from "./global-search";
import { Wordmark } from "./wordmark";
import { PointerGlow } from "./pointer-glow";
import { RegionContext } from "./region-context";
import { RegionPicker } from "./region-picker";
import { regionSchema } from "@/lib/albion/region-config";

// The header's tools menu follows the tool directory, so the two never drift apart.
const headerTools = ["Economy", "Builds & comps", "Teams & community"].flatMap((group) =>
  tools.filter((t) => t.group === group && t.href.startsWith("/tools")),
);
const toolLinks: [string, string][] = [
  ["/tools", "All tools"],
  ...headerTools.map((t): [string, string] => [t.href, t.title]),
  ["/shopping-list", "Crafting planner"],
  ["/items", "Item database"],
];
const sections = [
  ["/tools/market", "Market"],
  ["/builds", "Builds"],
  ["/compositions", "Comps"],
  ["/guides", "Guides"],
  ["/groups", "Teams"],
];
const footerColumns: [string, [string, string][]][] = [
  [
    "Explore",
    [
      ["/tools/market", "Market prices"],
      ["/builds/library", "Build library"],
      ["/compositions/library", "Group builds"],
      ["/items", "Item database"],
      ["/guides", "Player guides"],
      ["/market-data", "About market data"],
    ],
  ],
  [
    "Tools",
    [
      ["/tools/crafting", "Crafting calculator"],
      ["/tools/refining", "Refining calculator"],
      ["/tools/flipping", "Flipping calculator"],
      ["/tools/transporting", "Transport routes"],
      ["/tools/reference", "Reference tables"],
      ["/tools", "Every tool"],
    ],
  ],
  [
    "Your workspace",
    [
      ["/builds/new", "New build"],
      ["/compositions/new", "New composition"],
      ["/groups", "Team pages"],
      ["/dashboard", "Dashboard"],
      ["/signin", "Sign in to Outpost"],
    ],
  ],
];
const accountLinks = [
  ["/dashboard", "My dashboard"],
  ["/timers", "Personal timers"],
  ["/shopping-list", "Shopping list"],
  ["/favorites", "My favorites"],
  ["/settings", "Settings"],
  ["/signin", "Sign in"],
];

/* Follows ?region= in the URL after client navigations. It sits in its own Suspense boundary:
 * reading the query string in the shell itself made the whole page render on the client,
 * so a refresh showed a bare "Loading" line until JavaScript arrived. */
function UrlRegion({ onChange }: { onChange: (region: string | null) => void }) {
  const region = useSearchParams().get("region");
  useEffect(() => onChange(region), [region, onChange]);
  return null;
}

export function Shell({
  children,
  initialLight = false,
  initialRegion = "europe",
  authenticated = false,
  account = null,
}: {
  children: React.ReactNode;
  initialLight?: boolean;
  initialRegion?: string;
  authenticated?: boolean;
  account?: { name: string | null; image: string | null } | null;
}) {
  const [open, setOpen] = useState(false),
    [light, setLight] = useState(initialLight),
    [savedRegion, setSavedRegion] = useState(initialRegion);
  const drawer = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    close = useRef<HTMLButtonElement>(null),
    header = useRef<HTMLElement>(null);
  const [urlRegion, setUrlRegion] = useState<string | null>(null);
  const path = usePathname(),
    router = useRouter();
  const region = regionSchema.catch("europe").parse(urlRegion || savedRegion);
  const active = (href: string) => path === href || (href !== "/" && path.startsWith(`${href}/`));
  const href = (url: string) =>
    `${url === "/builds" ? "/builds/library" : url === "/compositions" ? "/compositions/library" : url}?region=${region}`;
  const productShell = true;
  const workspace = !["/", "/signin", "/legal"].includes(path) && !path.startsWith("/guides");
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const triggerElement = trigger.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const resize = () => {
      if (innerWidth > 1100) setOpen(false);
    };
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("resize", resize);
      triggerElement?.focus();
    };
  }, [open]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) {
        header.current?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  // The new theme washes over the page as a circle growing from the switch that was pressed;
  // without view transitions or with reduced motion it simply changes.
  const toggleTheme = (event?: ReactMouseEvent<HTMLElement>) => {
    const next = !light;
    const commit = () => {
      flushSync(() => setLight(next));
      document.cookie = `atlas-theme=${next ? "light" : "dark"}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    };
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || typeof document.startViewTransition !== "function") return commit();
    const box = event?.currentTarget.getBoundingClientRect();
    const x = box ? box.left + box.width / 2 : innerWidth / 2;
    const y = box ? box.top + box.height / 2 : 0;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(commit);
    transition.ready
      .then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          {
            duration: 720,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        ),
      )
      .catch(() => {});
  };
  const navigate = () => {
    setOpen(false);
    header.current?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
  };
  const primaryNavigation = (
    <nav className="desktop-navigation" aria-label="Main navigation">
      {sections.slice(0, 3).map(([url, label]) => (
        <Link
          key={url}
          href={href(url)}
          onClick={navigate}
          aria-current={(url === "/tools/market" ? path === url : active(url)) ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
      <details
        className={`nav-dropdown${(active("/tools") && path !== "/tools/market") || active("/items") ? " is-active" : ""}`}
      >
        <summary>
          <Grid2X2 size={17} /> Tools <ChevronDown size={13} />
        </summary>
        <div className="dropdown-panel tools-dropdown-panel">
          <div className="tools-menu-heading">
            <span>Markets & calculators</span>
            <small>Outpost tools</small>
          </div>
          <div className="tools-menu-grid">
            {toolLinks
              .filter(([url]) => url !== "/tools")
              .map(([url, label]) => (
                <Link
                  key={url}
                  href={href(url)}
                  onClick={navigate}
                  aria-current={path === url ? "page" : undefined}
                >
                  <span className="dropdown-tool-icon">
                    <ToolIcon
                      name={tools.find((tool) => tool.href === url)?.icon ?? "catalog"}
                      size={25}
                    />
                  </span>
                  <span>
                    <strong>{label}</strong>
                    <small>
                      {url === "/items"
                        ? "Stats, recipes, tiers and prices"
                        : url === "/shopping-list"
                          ? "Queue a session, buy what you need"
                          : (tools.find((tool) => tool.href === url)?.description ?? "")}
                    </small>
                  </span>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
          </div>
          <Link className="tools-menu-all" href={href("/tools")} onClick={navigate}>
            All tools <ArrowUpRight size={16} />
          </Link>
        </div>
      </details>
      {sections.slice(3).map(([url, label]) => (
        <Link
          key={url}
          href={href(url)}
          onClick={navigate}
          aria-current={active(url) ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
      <details
        className={`nav-dropdown more-dropdown${accountLinks.some(([url]) => url !== "/signin" && active(url)) ? " is-active" : ""}`}
      >
        <summary>
          More <ChevronDown size={13} />
        </summary>
        <div className="dropdown-panel">
          {accountLinks
            .filter(([url]) => url !== "/signin")
            .map(([url, label]) => (
              <Link
                key={url}
                href={href(url)}
                onClick={navigate}
                aria-current={path === url ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
        </div>
      </details>
    </nav>
  );
  return (
    <RegionContext.Provider value={region}>
      <div
        data-motion-enabled="true"
        className={`app outpost${light ? " light" : ""}${path === "/" ? " home-route" : ""}${workspace ? " workspace-route" : ""}${productShell ? " product-route" : ""}`}
      >
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <PointerGlow />
        <Suspense fallback={null}>
          <UrlRegion onChange={setUrlRegion} />
        </Suspense>
        {open && (
          <button
            className="drawer-backdrop"
            aria-label="Dismiss navigation"
            onClick={() => setOpen(false)}
          />
        )}
        {open && (
          <aside
            ref={drawer}
            id="outpost-mobile-navigation"
            className="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
              if (e.key === "Tab") {
                const nodes = Array.from(
                    drawer.current?.querySelectorAll<HTMLElement>(
                      "a[href],button:not([disabled])",
                    ) || [],
                  ),
                  first = nodes[0],
                  last = nodes[nodes.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <div className="drawer-heading">
              <Link href={href("/")} onClick={navigate} aria-label="Outpost home">
                <Wordmark priority light={light} />
              </Link>
              <button ref={close} aria-label="Close navigation" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <nav aria-label="Mobile navigation">
              <div className="nav-label">EXPLORE OUTPOST</div>
              {sections.map(([url, label]) => (
                <Link
                  key={url}
                  href={href(url)}
                  onClick={navigate}
                  aria-current={active(url) ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
              <div className="nav-label">TOOLS & MARKETS</div>
              <div className="drawer-tool-grid">
                {toolLinks.map(([url, label]) => (
                  <Link
                    key={url}
                    href={href(url)}
                    onClick={navigate}
                    aria-current={path === url ? "page" : undefined}
                  >
                    {label}
                  </Link>
                ))}
              </div>
              <div className="nav-label">YOUR WORKSPACE</div>
              {accountLinks
                .filter(([url]) => !authenticated || url !== "/signin")
                .map(([url, label]) => (
                  <Link key={url} href={href(url)} onClick={navigate}>
                    {label}
                  </Link>
                ))}
              {authenticated && <LogoutButton />}
            </nav>
            <button
              className="drawer-theme button secondary"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              {light ? <Moon size={16} /> : <Sun size={16} />} Switch to {light ? "dark" : "light"}{" "}
              theme
            </button>
          </aside>
        )}
        <div className="main" inert={open ? true : undefined} aria-hidden={open ? true : undefined}>
          <header
            className="site-header"
            ref={header}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                const details = (e.target as HTMLElement).closest("details");
                if (details) {
                  details.removeAttribute("open");
                  details.querySelector("summary")?.focus();
                }
              }
            }}
          >
            <Link className="top-brand" href={href("/")} aria-label="Outpost home">
              <Wordmark light={light} />
            </Link>
            {primaryNavigation}
            <div className="header-actions">
              <GlobalSearch />
              <RegionPicker
                value={region}
                onChange={(next) => {
                  const p = new URLSearchParams(window.location.search);
                  p.set("region", next);
                  setSavedRegion(next);
                  document.cookie = `atlas-region=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
                  router.push(`${path}?${p}`);
                }}
              />
              <button
                type="button"
                className="theme-toggle theme-switch"
                data-mode={light ? "light" : "dark"}
                aria-label="Toggle theme"
                aria-pressed={light}
                title={light ? "Switch to dark mode" : "Switch to light mode"}
                onClick={toggleTheme}
              >
                <span className="theme-switch-thumb" aria-hidden="true" />
                <span
                  className={`theme-switch-option is-sun${light ? " is-on" : ""}`}
                  aria-hidden="true"
                >
                  <Sun size={17} strokeWidth={2.2} />
                </span>
                <span
                  className={`theme-switch-option is-moon${light ? "" : " is-on"}`}
                  aria-hidden="true"
                >
                  <Moon size={16} strokeWidth={2.2} />
                </span>
              </button>
              {!authenticated ? (
                <Link
                  className="button secondary home-auth-action discord-login"
                  aria-label="Sign in"
                  href={href("/signin")}
                >
                  <DiscordMark />
                  <span className="discord-label">Sign in</span>
                </Link>
              ) : (
                <details className="nav-dropdown account-dropdown">
                  <summary>
                    {account?.image ? (
                      // Discord profile imagery belongs to the signed-in user; no synthetic avatar.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="account-avatar"
                        src={account.image}
                        width={30}
                        height={30}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <span>{account?.name || "Your account"}</span> <ChevronDown size={13} />
                  </summary>
                  <div className="dropdown-panel">
                    {accountLinks
                      .filter(([url]) => !authenticated || url !== "/signin")
                      .map(([url, label]) => (
                        <Link
                          key={url}
                          href={href(url)}
                          onClick={navigate}
                          aria-current={path === url ? "page" : undefined}
                        >
                          {label}
                        </Link>
                      ))}
                    <LogoutButton />
                  </div>
                </details>
              )}
              <button
                ref={trigger}
                className="navigation-trigger"
                aria-expanded={open}
                aria-label="Open navigation"
                aria-controls={open ? "outpost-mobile-navigation" : undefined}
                aria-haspopup="dialog"
                onClick={() => setOpen(true)}
              >
                <Menu size={21} />
              </button>
            </div>
          </header>
          <div
            className={`${productShell ? "product-frame " : ""}${workspace ? "workspace-frame" : "page-frame"}`}
          >
            <main
              id="main-content"
              tabIndex={-1}
              data-page={path.split("/")[1] || "home"}
              data-width={
                path.startsWith("/compositions/")
                  ? "board"
                  : path.startsWith("/guides/") || path === "/legal"
                    ? "reading"
                    : workspace
                      ? "workspace"
                      : "marketing"
              }
            >
              {children}
            </main>
          </div>
          <footer className="site-footer">
            <div className="site-footer-brand">
              <Link href={href("/")} className="footer-wordmark" aria-label="Outpost home">
                <Wordmark light={light} />
              </Link>
              <p>Independent Albion Online tools. Make your next move count.</p>
              <p className="site-footer-source">
                Prices are player observations from the Albion Online Data Project. Outpost is not
                affiliated with Sandbox Interactive.
              </p>
            </div>
            {footerColumns.map(([title, links]) => (
              <nav key={title} className="site-footer-column" aria-label={title}>
                <h2>{title}</h2>
                {links
                  .filter(([url]) => !authenticated || url !== "/signin")
                  .map(([url, label]) => (
                    <Link key={url} href={href(url)}>
                      {label}
                    </Link>
                  ))}
              </nav>
            ))}
            <div className="site-footer-legal">
              <Link href="/legal">
                Privacy & terms <ArrowUpRight size={13} />
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </RegionContext.Provider>
  );
}
