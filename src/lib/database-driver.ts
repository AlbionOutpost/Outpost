import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalDb.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;

// Cloudflare builds replace this driver. Node runs the same domain services locally.
export function databaseService<T>(_name: string, _args: unknown[]): Promise<T> | undefined {
  void _name;
  void _args;
  return undefined;
}
