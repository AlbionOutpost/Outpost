import { buildCompositionLaunch, compositionLaunchPath } from "./compositions/build-launch";
/** Narrow return destinations for composition drafts and team invitation confirmation. */
export function safeSignInReturn(value: unknown): string {
  if (value === "/settings" || value === undefined || value === null || value === "")
    return "/settings";
  if (
    typeof value !== "string" ||
    value.length > 800 ||
    value.includes("\\") ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    return "/settings";
  if (/^\/invitations\/[a-f0-9]{64}$/.test(value)) return value;
  try {
    const url = new URL(value, "https://outpost.invalid");
    if (
      url.origin !== "https://outpost.invalid" ||
      url.pathname !== "/compositions/new" ||
      url.hash
    )
      return "/settings";
    for (const key of url.searchParams.keys())
      if (url.searchParams.getAll(key).length !== 1) return "/settings";
    const parsed = buildCompositionLaunch.safeParse(Object.fromEntries(url.searchParams));
    return parsed.success ? compositionLaunchPath(parsed.data) : "/settings";
  } catch {
    return "/settings";
  }
}

/** NextAuth emits absolute callback URLs on retries. Trust only configured server origin. */
export function safeSignInPageReturn(value: unknown, configuredUrl?: string): string {
  if (typeof value !== "string" || !/^https?:\/\//.test(value)) return safeSignInReturn(value);
  try {
    if (
      !configuredUrl ||
      value.length > 1000 ||
      value.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(value)
    )
      return "/settings";
    const trusted = new URL(configuredUrl),
      url = new URL(value);
    if (
      !["http:", "https:"].includes(trusted.protocol) ||
      url.origin !== trusted.origin ||
      url.username ||
      url.password
    )
      return "/settings";
    if (url.pathname.startsWith("/invitations/") && value !== trusted.origin + url.pathname)
      return "/settings";
    return safeSignInReturn(url.pathname + url.search + url.hash);
  } catch {
    return "/settings";
  }
}
