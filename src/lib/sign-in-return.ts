import { buildCompositionLaunch, compositionLaunchPath } from "./compositions/build-launch";
/** Narrow return destination for build-to-composition sign-in. Never accepts external URLs. */
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
