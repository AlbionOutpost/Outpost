import { AsyncLocalStorage } from "node:async_hooks";
import type { PrismaClient } from "@prisma/client";

// Each request gets its own client/transaction context; never a mutable global current database.
export const databaseContext = new AsyncLocalStorage<object>();
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const stored = databaseContext.getStore();
    if (!stored) throw new Error("Database operation outside private transaction context");
    const client = stored as PrismaClient;
    if (property === "$transaction")
      return async (work: ((tx: PrismaClient) => unknown) | Promise<unknown>[]) =>
        typeof work === "function" ? work(client) : Promise.all(work);
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
export function databaseService<T>(_name: string, _args: unknown[]): Promise<T> | undefined {
  void _name;
  void _args;
  return undefined;
}
