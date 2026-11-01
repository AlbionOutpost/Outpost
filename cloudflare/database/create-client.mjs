import { PrismaClient } from "../generated/prisma/wasm.js";
import { PrismaD1 } from "@prisma/adapter-d1";
import { sqliteQueryBridge } from "./sqlite-bridge.mjs";
import { longLiteralLike } from "./long-like.mjs";

export function storageClient(storage) {
  return new PrismaClient({ adapter: new PrismaD1(sqliteQueryBridge(storage)) });
}
export function catalogClient(binding) {
  const queries = {
    prepare(sql) {
      return {
        bind(...args) {
          const query = longLiteralLike(sql, args);
          return binding.prepare(query.sql).bind(...query.args);
        },
      };
    },
  };
  return new PrismaClient({ adapter: new PrismaD1(queries) });
}
