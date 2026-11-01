import { DurableObject } from "cloudflare:workers";

/** One small, persistent coordination object per rate identity (including regional upstream budgets). */
export class AbuseBudget extends DurableObject {
  async allow(limit: number, seconds: number) {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 10_000 ||
      !Number.isInteger(seconds) ||
      seconds < 1 ||
      seconds > 86_400
    )
      return false;
    return this.ctx.storage.transaction(async () => {
      const now = Date.now();
      const state = await this.ctx.storage.get<{
        count: number;
        until: number;
        blockedUntil?: number;
      }>("budget");
      if (state?.blockedUntil && state.blockedUntil > now) return false;
      if (state && state.until > now && state.count >= limit) return false;
      const next =
        state && state.until > now
          ? { ...state, count: state.count + 1 }
          : { count: 1, until: now + seconds * 1000 };
      await this.ctx.storage.put("budget", next);
      if (!state || state.until <= now) await this.ctx.storage.setAlarm(next.until);
      return next.count <= limit;
    });
  }
  async blocked() {
    const state = await this.ctx.storage.get<{ blockedUntil?: number }>("budget");
    return (state?.blockedUntil ?? 0) > Date.now();
  }
  async block(milliseconds: number) {
    if (!Number.isFinite(milliseconds) || milliseconds < 1 || milliseconds > 3_600_000)
      throw new Error("Invalid upstream cooldown");
    return this.ctx.storage.transaction(async () => {
      const state = await this.ctx.storage.get<{
        count: number;
        until: number;
        blockedUntil?: number;
      }>("budget");
      const until = Date.now() + milliseconds;
      await this.ctx.storage.put("budget", {
        count: 0,
        until,
        ...state,
        blockedUntil: Math.max(until, state?.blockedUntil ?? 0),
      });
      await this.ctx.storage.setAlarm(Math.max(until, state?.until ?? 0));
    });
  }
  async alarm() {
    return this.ctx.storage.transaction(async () => {
      const state = await this.ctx.storage.get<{ until: number; blockedUntil?: number }>("budget");
      const expires = Math.max(state?.until ?? 0, state?.blockedUntil ?? 0);
      if (expires > Date.now()) await this.ctx.storage.setAlarm(expires);
      else await this.ctx.storage.delete("budget");
    });
  }
}
