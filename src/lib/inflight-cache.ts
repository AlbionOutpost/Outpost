// Node can share pending work across requests. Workers replace this with request-owned maps.
const namespaces = new Map<string, Map<string, Promise<unknown>>>();
export function inflightCache(name: string) {
  let entries = namespaces.get(name);
  if (!entries) {
    entries = new Map();
    namespaces.set(name, entries);
  }
  return entries;
}
