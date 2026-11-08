"use client";
import Link from "@/components/link";
import { Suspense, useState, useRef, useEffect, useTransition } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Menu,
  X,
  Sun,
  Moon,
  MoonStar,
  ChevronDown,
  ArrowUp,
  LogOut,
  ArrowUpRight,
  Grid2X2,
  Heart,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { DiscordMark } from "./discord-mark";
import { LogoutButton } from "./login-button";
import { ToolIcon } from "./tool-icon";
import { tools, toolPaintings, toolSections } from "@/lib/tool-directory";
import { BrandLockup } from "./brand-lockup";
import { PointerGlow } from "./pointer-glow";
import { RegionContext, RegionNavigationContext } from "./region-context";
import { RegionPicker } from "./region-picker";
import { AvatarFrame } from "./avatar-frame";
import { regionSchema } from "@/lib/albion/region-config";
import { legalPublished } from "@/lib/legal";

// The header's tools menu groups by the tool directory's sections, so the two never drift apart:
// three columns, the third holding gathering and the two look-up tools.
type DirectoryTool = (typeof tools)[number];
const toolGroup = (title: string, hrefs: readonly string[]) => ({
  title,
  tools: hrefs.flatMap((url) => tools.filter((t) => t.href === url)),
});
const toolColumns = [
  [toolGroup(toolSections[0].title, toolSections[0].hrefs)],
  [toolGroup(toolSections[1].title, toolSections[1].hrefs)],
  [
    toolGroup(toolSections[2].title, toolSections[2].hrefs),
    toolGroup("Look up", ["/items", "/tools/kill-feed"]),
  ],
];
/** A tool's painted emblem where it has one, else its line glyph in a small well. */
function ToolMenuMark({ tool }: { tool: DirectoryTool }) {
  const painting = toolPaintings[tool.href];
  return (
    <span className={`tool-menu-mark${painting ? "" : " well"}`} aria-hidden="true">
      {painting ? (
        // eslint-disable-next-line @next/next/no-img-element -- owner-supplied task emblem
        <img src={`/albion/icons/${painting}.webp`} alt="" width={28} height={28} />
      ) : (
        <ToolIcon name={tool.icon} size={15} />
      )}
    </span>
  );
}
const sections = [
  ["/tools/market", "Market"],
  ["/builds", "Builds"],
  ["/compositions", "Comps"],
  ["/guides", "Guides"],
  ["/groups", "Teams"],
];
/** The drawer's main five carry the painted emblems the landing uses for them. */
const sectionEmblems: Record<string, string> = {
  "/tools/market": "tool-market",
  "/builds": "strip-builds",
  "/compositions": "strip-comps",
  "/guides": "strip-content",
  "/groups": "team-roles",
};
/** The footer directory: four labelled columns of real routes (no Supporter: everything is free). */
const footerColumns = [
  {
    label: "Tools",
    links: [
      ["/tools/market", "Market Explorer"],
      ["/tools/crafting", "Crafting calculator"],
      ["/tools/flipping", "Market flipping"],
      ["/shopping-list", "Crafting Planner"],
      ["/items", "Item database"],
      ["/tools", "All tools"],
    ],
  },
  {
    label: "Builds & Comps",
    links: [
      ["/builds/activities", "Builds by activity"],
      ["/builds", "All builds"],
      ["/builds/new", "Create a build"],
      ["/compositions", "Comps by activity"],
      ["/compositions?view=all", "All comps"],
      ["/compositions/new", "Create a comp"],
    ],
  },
  {
    label: "Guides",
    links: [
      ["/guides", "All guides"],
      ["/guides/making-silver", "Making silver"],
      ["/guides/focus-and-resource-return-rate", "Focus and RRR"],
      ["/guides/hellgates-guide", "Hellgates"],
      ["/guides/planning-a-comp", "Plan a party comp"],
    ],
  },
  {
    label: "Outpost",
    links: [
      ["/groups", "Teams"],
      ["/dashboard", "Dashboard"],
      ["/timers", "Timers"],
      ["/market-data", "How prices work"],
      ["/settings", "Settings"],
    ],
  },
] as const;
/** Header menu entries, grouped, each with its glyph. Signed in, the account menu holds
 * "Your account" and More keeps only Planning, so no link shows twice (the drawer lists all). */
const menuItems: Record<string, { group: "Your account" | "Planning"; icon: typeof Timer }> = {
  "/dashboard": { group: "Your account", icon: LayoutDashboard },
  "/favorites": { group: "Your account", icon: Heart },
  "/settings": { group: "Your account", icon: Settings },
  "/admin": { group: "Your account", icon: ShieldCheck },
  "/admin/reports": { group: "Your account", icon: ShieldCheck },
  "/timers": { group: "Planning", icon: Timer },
  "/shopping-list": { group: "Planning", icon: ListChecks },
};
const accountLinks = [
  ["/dashboard", "My dashboard"],
  ["/timers", "Personal timers"],
  ["/shopping-list", "Crafting Planner"],
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
  account?: {
    name: string | null;
    image: string | null;
    avatarFrame?: string | null;
    role?: string;
  } | null;
}) {
  const currentAccountLinks = [
    ...accountLinks,
    ...(account?.role === "ADMIN"
      ? [["/admin", "Administration"]]
      : account?.role === "MODERATOR"
        ? [["/admin/reports", "Moderation"]]
        : []),
  ];
  const [open, setOpen] = useState(false),
    [light, setLight] = useState(initialLight),
    [savedRegion, setSavedRegion] = useState(initialRegion);
  const drawer = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    close = useRef<HTMLButtonElement>(null),
    header = useRef<HTMLElement>(null);
  const lightRef = useRef(initialLight),
    themeTransition = useRef<ViewTransition | null>(null);
  const [urlRegion, setUrlRegion] = useState<string | null>(null);
  const [regionPending, startRegionNavigation] = useTransition();
  const path = usePathname(),
    router = useRouter();
  const region = regionSchema.catch("europe").parse(urlRegion || savedRegion);
  const active = (href: string) => path === href || (href !== "/" && path.startsWith(`${href}/`));
  /* Pages that live in the account menu but belong to a section the player is browsing:
   * favorites sit under Builds and the shopping list is the Crafting Planner tool. */
  const homeSection: Record<string, string> = {
    "/favorites": "/builds",
    "/shopping-list": "/tools",
  };
  const href = (url: string) =>
    `${url === "/builds" ? "/builds/activities" : url}${url.includes("?") ? "&" : "?"}region=${region}`;
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
    // No cooldown: a click during the reveal finishes it at once and starts the next one.
    themeTransition.current?.skipTransition();
    const next = !lightRef.current;
    lightRef.current = next;
    // Saved at once, so a reload straight after the click keeps the choice
    document.cookie = `atlas-theme=${next ? "light" : "dark"}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    const commit = () => {
      flushSync(() => setLight(next));
    };
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || typeof document.startViewTransition !== "function") return commit();
    const box = event?.currentTarget.getBoundingClientRect();
    const x = box ? box.left + box.width / 2 : innerWidth / 2;
    const y = box ? box.top + box.height / 2 : 0;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    // Reveal the destination theme with the same deceleration in either direction.
    // Animating the outgoing light snapshot made the dark change feel delayed.
    const root = document.documentElement;
    root.dataset.themeReveal = "out";
    const transition = document.startViewTransition(commit);
    themeTransition.current = transition;
    transition.finished.finally(() => {
      if (themeTransition.current === transition) {
        themeTransition.current = null;
        delete root.dataset.themeReveal;
      }
    });
    const small = `circle(0px at ${x}px ${y}px)`,
      full = `circle(${radius}px at ${x}px ${y}px)`;
    transition.ready
      .then(() =>
        root.animate(
          { clipPath: [small, full] },
          {
            duration: 520,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "forwards",
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
  const menuGroup = (group: string) =>
    currentAccountLinks
      .filter(([url]) => menuItems[url]?.group === group)
      .map(([url, label]) => {
        const Icon = menuItems[url].icon;
        return (
          <Link
            key={url}
            className="menu-item"
            href={href(url)}
            onClick={navigate}
            aria-current={path === url ? "page" : undefined}
          >
            <span className="tool-menu-mark" aria-hidden="true">
              <Icon size={17} />
            </span>
            {label}
          </Link>
        );
      });
  const primaryNavigation = (
    <nav className="desktop-navigation" aria-label="Main navigation">
      {sections.slice(0, 3).map(([url, label]) => (
        <Link
          key={url}
          href={href(url)}
          onClick={navigate}
          aria-current={
            (url === "/tools/market" ? path === url : active(url) || homeSection[path] === url)
              ? "page"
              : undefined
          }
        >
          {label}
        </Link>
      ))}
      <details
        className={`nav-dropdown tools-dropdown${(active("/tools") && path !== "/tools/market") || active("/items") || homeSection[path] === "/tools" ? " is-active" : ""}`}
      >
        <summary>
          <Grid2X2 size={17} /> Tools <ChevronDown size={13} />
        </summary>
        <div className="menu-panel tools-menu-panel">
          <div className="tools-menu-columns">
            {toolColumns.map((column, i) => (
              <div key={i} className="tools-menu-column">
                {column.map((group) => (
                  <div key={group.title} role="group" aria-label={group.title}>
                    <p className="menu-label" aria-hidden="true">
                      {group.title}
                    </p>
                    {group.tools.map((tool) => (
                      <Link
                        key={tool.href}
                        className="menu-item"
                        href={href(tool.href)}
                        onClick={navigate}
                        aria-current={path === tool.href ? "page" : undefined}
                      >
                        <ToolMenuMark tool={tool} />
                        {tool.title}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="menu-group">
            <Link className="menu-item" href={href("/tools")} onClick={navigate}>
              <span className="tool-menu-mark" aria-hidden="true">
                <Grid2X2 size={17} />
              </span>
              All tools
            </Link>
          </div>
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
        className={`nav-dropdown more-dropdown${!homeSection[path] && currentAccountLinks.some(([url]) => url !== "/signin" && active(url)) ? " is-active" : ""}`}
      >
        <summary>
          More <ChevronDown size={13} />
        </summary>
        <div className="menu-panel">
          {(authenticated ? (["Planning"] as const) : (["Your account", "Planning"] as const)).map(
            (group) => (
              <div key={group} className="menu-group" role="group" aria-label={group}>
                <p className="menu-label" aria-hidden="true">
                  {group}
                </p>
                {menuGroup(group)}
              </div>
            ),
          )}
        </div>
      </details>
    </nav>
  );
  return (
    <RegionContext.Provider value={region}>
      <RegionNavigationContext.Provider value={regionPending}>
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
                <BrandLockup size="sm" onClick={navigate} />
                <button ref={close} aria-label="Close navigation" onClick={() => setOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <nav aria-label="Mobile navigation">
                <p className="drawer-label">Explore</p>
                <div className="drawer-main">
                  {sections.map(([url, label]) => (
                    <Link
                      key={url}
                      href={href(url)}
                      onClick={navigate}
                      aria-current={active(url) ? "page" : undefined}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                      <img
                        src={`/albion/icons/${sectionEmblems[url]}.webp`}
                        alt=""
                        width={32}
                        height={32}
                      />
                      {label}
                    </Link>
                  ))}
                </div>
                {toolColumns.flat().map((group) => (
                  <div key={group.title} role="group" aria-label={group.title}>
                    <p className="drawer-label" aria-hidden="true">
                      {group.title}
                    </p>
                    <div className="drawer-list well">
                      {group.tools.map((tool) => (
                        <Link
                          key={tool.href}
                          href={href(tool.href)}
                          onClick={navigate}
                          aria-current={path === tool.href ? "page" : undefined}
                        >
                          <ToolMenuMark tool={tool} />
                          {tool.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <Link className="pill-link drawer-all" href={href("/tools")} onClick={navigate}>
                  All tools <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
                <p className="drawer-label">Your account</p>
                <div className="drawer-list well">
                  {currentAccountLinks
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
                </div>
                {authenticated && <LogoutButton />}
              </nav>
              <button
                className="drawer-theme button secondary"
                aria-label="Toggle theme"
                onClick={toggleTheme}
              >
                {light ? <Moon size={16} /> : <Sun size={16} />} Switch to{" "}
                {light ? "dark" : "light"} theme
              </button>
            </aside>
          )}
          <div
            className="main"
            inert={open ? true : undefined}
            aria-hidden={open ? true : undefined}
          >
            <div className="site-backdrop" aria-hidden="true" />
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
              <BrandLockup className="top-brand" />
              {primaryNavigation}
              <div className="header-actions">
                <RegionPicker
                  value={region}
                  onChange={(next) => {
                    const p = new URLSearchParams(window.location.search);
                    p.set("region", next);
                    // Invalidate region-scoped client work immediately, while the
                    // server navigation is still pending.
                    setUrlRegion(next);
                    setSavedRegion(next);
                    document.cookie = `atlas-region=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
                    startRegionNavigation(() => router.push(`${path}?${p}`));
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
                    <Sun size={18} strokeWidth={2.1} />
                  </span>
                  <span
                    className={`theme-switch-option is-moon${light ? "" : " is-on"}`}
                    aria-hidden="true"
                  >
                    <MoonStar size={17} strokeWidth={2} />
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
                      {account?.image || account?.avatarFrame ? (
                        <AvatarFrame
                          frame={account.avatarFrame}
                          size={32}
                          image={account.image}
                          name={account.name}
                        />
                      ) : null}
                      <span>{account?.name || "Your account"}</span> <ChevronDown size={13} />
                    </summary>
                    <div className="menu-panel">
                      <div className="menu-group" role="group" aria-label="Your account">
                        {menuGroup("Your account")}
                      </div>
                      <div className="menu-group">
                        <LogoutButton className="menu-item">
                          <span className="tool-menu-mark" aria-hidden="true">
                            <LogOut size={17} />
                          </span>
                          Sign out
                        </LogoutButton>
                      </div>
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
              <div className="site-footer-inner">
                <div className="site-footer-brand">
                  <BrandLockup size="sm" className="site-footer-lockup" />
                  <p className="site-footer-line">
                    Markets, builds, comps and crafting for Albion Online, in one place.
                  </p>
                  <p className="site-footer-source">
                    Prices from the{" "}
                    <a href="https://www.albion-online-data.com/" rel="noopener noreferrer">
                      Albion Online Data Project
                    </a>
                    . Not affiliated with or endorsed by Sandbox Interactive.
                  </p>
                </div>
                <nav className="site-footer-navigation" aria-label="Footer">
                  {footerColumns.map((column, c) => (
                    <div key={column.label} className="site-footer-column">
                      <p className="site-footer-label" id={`footer-column-${c}`}>
                        {column.label}
                      </p>
                      <ul aria-labelledby={`footer-column-${c}`}>
                        {column.links.map(([url, label]) => (
                          <li key={url}>
                            <Link href={href(url)}>{label}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </nav>
                <div className="site-footer-legal">
                  <span>© {new Date().getFullYear()} Outpost</span>
                  {legalPublished && <Link href="/legal">Privacy &amp; terms</Link>}
                  <button
                    type="button"
                    className="site-footer-top"
                    onClick={() =>
                      window.scrollTo({
                        top: 0,
                        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                          ? "auto"
                          : "smooth",
                      })
                    }
                  >
                    Back to top <ArrowUp size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </RegionNavigationContext.Provider>
    </RegionContext.Provider>
  );
}
