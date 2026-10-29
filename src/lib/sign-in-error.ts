const messages: Record<string, string> = {
  OAuthSignin: "Discord sign-in could not be started. Please try again.",
  OAuthCallback:
    "Discord could not finish signing you in. Start again from this page. If it keeps happening, allow cookies for Outpost and Discord.",
  OAuthCreateAccount: "Your Outpost account could not be created. Please try again shortly.",
  Callback: "Sign-in could not be completed. Please start again.",
  OAuthAccountNotLinked:
    "This email is already linked to an Outpost account. Sign in with the Discord account you originally used.",
  AccessDenied: "Discord access was cancelled or denied. You can try again when you are ready.",
  SessionRequired: "Sign in to continue to your account.",
  Configuration: "Sign-in is temporarily unavailable. Please try again later.",
  RateLimit: "Too many sign-in attempts. Wait a minute, then try again.",
};
export function signInErrorMessage(error: unknown): string | null {
  if (error === undefined || error === null || error === "") return null;
  return typeof error === "string" && Object.hasOwn(messages, error)
    ? messages[error]
    : "Sign-in could not be completed. Please try again.";
}
