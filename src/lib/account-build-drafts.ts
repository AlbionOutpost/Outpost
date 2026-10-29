import type { BuildInput } from "./builds/validation";

type DraftEntry = { json: string; baseVersion?: number; expires: number };
export type RecoveredBuildDraft = { draft: BuildInput; baseVersion?: number };

/** Private, document-memory recovery only. Never writes to browser storage or the server.
 * Invalid intermediate form values intentionally survive; saving still uses buildInput.
 * An owner switch/logout invalidates outstanding writer leases as well as entries.
 */
export class AccountBuildDraftCache {
  private owner?: string;
  private generation = 0;
  private entries = new Map<string, DraftEntry>();
  constructor(
    private readonly now = Date.now,
    private readonly ttl = 30 * 60 * 1000,
    private readonly limit = 8,
    private readonly maxCharacters = 262144,
  ) {}
  activate(owner: string) {
    if (this.owner !== owner) {
      this.clear();
      this.owner = owner;
    }
    return this.generation;
  }
  clear() {
    this.entries.clear();
    this.owner = undefined;
    this.generation++;
  }
  private prune() {
    for (const [key, entry] of this.entries)
      if (entry.expires <= this.now()) this.entries.delete(key);
  }
  read(owner: string, key: string): RecoveredBuildDraft | undefined {
    this.prune();
    if (owner !== this.owner) return;
    const entry = this.entries.get(key);
    if (!entry) return;
    return { draft: JSON.parse(entry.json) as BuildInput, baseVersion: entry.baseVersion };
  }
  remember(owner: string, key: string, lease: number, draft: BuildInput, baseVersion?: number) {
    if (!owner || owner !== this.owner || lease !== this.generation) return false;
    this.prune();
    const json = JSON.stringify(draft);
    if (json.length > this.maxCharacters) {
      this.entries.delete(key);
      return false;
    }
    this.entries.delete(key);
    this.entries.set(key, { json, baseVersion, expires: this.now() + this.ttl });
    while (this.entries.size > this.limit) this.entries.delete(this.entries.keys().next().value!);
    return true;
  }
  forget(owner: string, key: string) {
    if (owner === this.owner) this.entries.delete(key);
  }
}

export const accountBuildDrafts = new AccountBuildDraftCache();
export const accountLogoutEvent = "outpost:account-logout";
