import { libraryListRedirect } from "@/lib/list-redirect";

// The Group Builds list is the Group Builds source of /compositions now; comp pages stay at
// /compositions/library/[slug].
export function GET(request: Request) {
  return libraryListRedirect(request.url, "/compositions");
}
