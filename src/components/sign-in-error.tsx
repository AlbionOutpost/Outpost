import { signInErrorMessage } from "@/lib/sign-in-error";
export function SignInError({ error }: { error: unknown }) {
  const message = signInErrorMessage(error);
  return message ? (
    <p className="signin-error" role="alert">
      {message}
    </p>
  ) : null;
}
