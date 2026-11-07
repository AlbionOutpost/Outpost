import { libraryListRedirect } from "@/lib/list-redirect";

// The build library list is the Library source of /builds now; build pages stay at
// /builds/library/[slug]. The library's sort names map onto the merged list's.
const sorts: Record<string, string> = { newest: "recent", title: "title" };
export function GET(request: Request) {
  return libraryListRedirect(request.url, "/builds", (key, value) =>
    key === "sort" ? (sorts[value] ?? "") : value,
  );
}
