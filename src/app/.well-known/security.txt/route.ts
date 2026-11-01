/** RFC 9116 security contact: reports go to the repository's private advisory form. */
export const dynamic = "force-static";
export function GET() {
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 300).toISOString();
  return new Response(
    [
      "Contact: https://github.com/AlbionOutpost/Outpost/security/advisories/new",
      `Expires: ${expires}`,
      "Preferred-Languages: en, de",
      "Canonical: https://albionoutpost.com/.well-known/security.txt",
      "",
    ].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
