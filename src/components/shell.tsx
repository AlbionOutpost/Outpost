"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  ArrowUpRight,
  Swords,
  Users,
  BookOpen,
  Castle,
  Grid2X2,
} from "lucide-react";
import { DiscordMark } from "./discord-mark";
import { ToolIcon } from "./tool-icon";
import { tools } from "@/lib/tool-directory";
import { GlobalSearch } from "./global-search";
import { Wordmark } from "./wordmark";
import { RegionContext } from "./region-context";
import { RegionPicker } from "./region-picker";
import { regionSchema } from "@/lib/albion/region-config";

const toolLinks = [
  ["/tools", "All tools"],
  ["/tools/market", "Market explorer"],
  ["/tools/flipping", "Profit calculator"],
  ["/tools/crafting", "Crafting"],
  ["/tools/cooking", "Cooking"],
  ["/tools/alchemy", "Alchemy"],
  ["/tools/fishing", "Fishing"],
  ["/tools/refining", "Refining"],
  ["/tools/enchanting", "Enchanting"],
  ["/tools/farming", "Farming"],
  ["/tools/transporting", "Transport planner"],
  ["/tools/gold", "Gold history"],
  ["/items", "Item reference"],
];
const sections = [
  ["/builds", "Builds"],
  ["/compositions", "Comps"],
  ["/guides", "Guides"],
  ["/groups", "Guilds"],
];
const accountLinks = [
  ["/dashboard", "My dashboard"],
  ["/timers", "Personal timers"],
  ["/favorites", "My favorites"],
  ["/settings", "Settings"],
  ["/signin", "Sign in"],
];

export function Shell({
  children,
  initialLight = false,
  initialRegion = "europe",
  authenticated = false,
}: {
  children: React.ReactNode;
  initialLight?: boolean;
  initialRegion?: string;
  authenticated?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [light, setLight] = useState(initialLight),
    [savedRegion, setSavedRegion] = useState(initialRegion);
  const drawer = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    close = useRef<HTMLButtonElement>(null),
    header = useRef<HTMLElement>(null);
  const path = usePathname(),
    search = useSearchParams(),
    router = useRouter();
  const region = regionSchema.catch("europe").parse(search.get("region") || savedRegion);
  const active = (href: string) => path === href || (href !== "/" && path.startsWith(`${href}/`));
  const href = (url: string) => `${url}?region=${region}`;
  const productShell = !["/signin", "/legal"].includes(path);
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
  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    document.cookie = `atlas-theme=${next ? "light" : "dark"}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  };
  const navigate = () => {
    setOpen(false);
    header.current?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
  };
  const primaryNavigation = (
    <nav className="desktop-navigation" aria-label="Main navigation">
      <details
        className={`nav-dropdown${active("/tools") || active("/items") ? " is-active" : ""}`}
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
                      {url === "/tools/market"
                        ? "City prices & history"
                        : url === "/tools/flipping"
                          ? "Fees & break-even"
                          : url === "/tools/crafting"
                            ? "Materials & returns"
                            : url === "/tools/refining"
                              ? "Raw to refined"
                              : url === "/tools/enchanting"
                                ? "Rune, soul & relic costs"
                                : url === "/tools/farming"
                                  ? "Crops, seeds & watering"
                                  : url === "/tools/transporting"
                                    ? "Cargo & city margins"
                                    : url === "/tools/gold"
                                      ? "Regional observations"
                                      : "Gear & item details"}
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
      {sections.map(([url, label]) => (
        <Link
          key={url}
          href={href(url)}
          onClick={navigate}
          aria-current={active(url) ? "page" : undefined}
        >
          {url === "/builds" ? (
            <Swords size={17} />
          ) : url === "/compositions" ? (
            <Users size={17} />
          ) : url === "/guides" ? (
            <BookOpen size={17} />
          ) : (
            <Castle size={17} />
          )}{" "}
          {label}
        </Link>
      ))}
      <Link
        href={href("/tools/market")}
        onClick={navigate}
        aria-current={path === "/tools/market" ? "page" : undefined}
      >
        Market
      </Link>
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
                <Wordmark />
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
              {accountLinks.map(([url, label]) => (
                <Link key={url} href={href(url)} onClick={navigate}>
                  {label}
                </Link>
              ))}
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
              <Wordmark />
            </Link>
            {primaryNavigation}
            <div className="header-actions">
              <GlobalSearch />
              <RegionPicker
                value={region}
                onChange={(next) => {
                  const p = new URLSearchParams(search.toString());
                  p.set("region", next);
                  setSavedRegion(next);
                  document.cookie = `atlas-region=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
                  router.push(`${path}?${p}`);
                }}
              />
              <button
                type="button"
                className="theme-toggle theme-single"
                aria-label="Toggle theme"
                aria-pressed={light}
                title={light ? "Switch to dark mode" : "Switch to light mode"}
                onClick={toggleTheme}
              >
                {light ? (
                  <Sun size={18} aria-hidden="true" />
                ) : (
                  <Moon size={18} aria-hidden="true" />
                )}
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
                    Your account <ChevronDown size={13} />
                  </summary>
                  <div className="dropdown-panel">
                    {accountLinks.map(([url, label]) => (
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
          <footer>
            <Link href={href("/")} className="footer-wordmark">
              <Wordmark />
            </Link>
            <span>Independent Albion Online tools. Make your next move count.</span>
            <Link href="/legal">
              Sources, privacy & attribution <ArrowUpRight size={13} />
            </Link>
          </footer>
        </div>
      </div>
    </RegionContext.Provider>
  );
}
