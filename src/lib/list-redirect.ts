/**
 * The library lists merged into `/builds` and `/compositions` (Nov 2026). Their old list URLs
 * answer with a permanent redirect to the merged list, filtered to the library, keeping every
 * other parameter (region, search, filters, page) and renaming the ones that changed.
 */
export function libraryListRedirect(
  url: string,
  target: "/builds" | "/compositions",
  rename: (key: string, value: string) => string = (_, value) => value,
) {
  const next = new URLSearchParams({ source: "library" });
  for (const [key, value] of new URL(url).searchParams) {
    if (key === "source") continue;
    const renamed = rename(key, value);
    if (renamed) next.append(key, renamed);
  }
  return new Response(null, { status: 308, headers: { Location: `${target}?${next}` } });
}
