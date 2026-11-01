import { safeSignInReturn } from "./sign-in-return";
import { signInErrorMessage } from "./sign-in-error";

const unavailable = "Sign-in is temporarily unavailable. Please try again shortly.";
class SignInStartError extends Error {}
type Fetcher = (path: string, options?: RequestInit) => Promise<Response>;

/** Keep the existing NextAuth CSRF/state/PKCE server flow; reject failed starts before navigation. */
export async function startDiscordSignIn(
  callbackUrl: string,
  origin: string,
  fetcher: Fetcher = fetch,
  signal: AbortSignal = AbortSignal.timeout(15000),
): Promise<string> {
  async function request(path: string, options?: RequestInit) {
    const response = await fetcher(path, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal,
    });
    if (response.status === 429) throw new SignInStartError(signInErrorMessage("RateLimit")!);
    if (!response.ok) throw new SignInStartError(unavailable);
    try {
      return await response.json();
    } catch {
      throw new SignInStartError(unavailable);
    }
  }
  try {
    const providers = await request("/api/auth/providers");
    if (providers?.discord?.id !== "discord" || providers.discord.type !== "oauth")
      throw new SignInStartError(unavailable);
    const csrf = await request("/api/auth/csrf");
    if (typeof csrf?.csrfToken !== "string" || !csrf.csrfToken || csrf.csrfToken.length > 4096)
      throw new SignInStartError(unavailable);
    const response = await request("/api/auth/signin/discord", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        callbackUrl: safeSignInReturn(callbackUrl),
        json: "true",
      }),
    });
    if (typeof response?.url !== "string" || response.url.length > 8192)
      throw new SignInStartError(unavailable);
    let url: URL;
    try {
      url = new URL(response.url, origin);
    } catch {
      throw new SignInStartError(unavailable);
    }
    if (
      url.origin === origin &&
      ["/api/auth/error", "/api/auth/signin", "/signin"].includes(url.pathname)
    )
      throw new SignInStartError(signInErrorMessage(url.searchParams.get("error")) || unavailable);
    const scopes = url.searchParams.get("scope")?.split(/\s+/).filter(Boolean) || [];
    const required = [
      "client_id",
      "redirect_uri",
      "response_type",
      "scope",
      "state",
      "code_challenge",
      "code_challenge_method",
    ];
    if (
      url.protocol !== "https:" ||
      url.hostname !== "discord.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.hash ||
      required.some((key) => url.searchParams.getAll(key).length !== 1) ||
      !/^\d{17,20}$/.test(url.searchParams.get("client_id") || "") ||
      !["/api/oauth2/authorize", "/oauth2/authorize"].includes(url.pathname) ||
      url.searchParams.get("redirect_uri") !== `${origin}/api/auth/callback/discord` ||
      url.searchParams.get("response_type") !== "code" ||
      !url.searchParams.get("state") ||
      !url.searchParams.get("code_challenge") ||
      url.searchParams.get("code_challenge_method") !== "S256" ||
      scopes.length !== 2 ||
      !scopes.includes("identify") ||
      !scopes.includes("email")
    )
      throw new SignInStartError(unavailable);
    return url.href;
  } catch (error) {
    if (error instanceof SignInStartError) throw error;
    throw new Error(
      signal.aborted
        ? "The sign-in request took too long. Please try again."
        : "Outpost could not be reached. Check your connection and try again.",
    );
  }
}
