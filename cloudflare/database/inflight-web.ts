import { getCloudflareContext } from "@opennextjs/cloudflare";
// Only immutable completed public observations may be shared globally. Pending Worker I/O
// belongs to its originating request; weak keys release each request's deduplication state.
const requests = new WeakMap<object, Map<string, Map<string, Promise<unknown>>>>();
export function inflightCache(name: string) {
  const { ctx } = getCloudflareContext();
  let namespaces = requests.get(ctx);
  if (!namespaces) {
    namespaces = new Map();
    requests.set(ctx, namespaces);
  }
  let entries = namespaces.get(name);
  if (!entries) {
    entries = new Map();
    namespaces.set(name, entries);
  }
  return entries;
}
