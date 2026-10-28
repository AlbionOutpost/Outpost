/**
 * Prisma's D1 query conversion over Durable Object SQLite.
 * Transactions MUST be supplied by the enclosing Durable Object storage transaction.
 * This bridge does not make D1 itself transactional.
 */
import { longLiteralLike } from "./long-like.mjs";
class Statement {
  constructor(storage, sql, args = []) {
    this.storage = storage;
    this.sql = sql;
    this.args = args;
  }
  bind(...args) {
    const query = longLiteralLike(this.sql, args);
    return new Statement(this.storage, query.sql, query.args);
  }
  async raw() {
    const cursor = this.storage.sql.exec(this.sql, ...this.args);
    const columns = cursor.columnNames;
    // Fully consume synchronously: cursors must never cross an await boundary.
    return [columns, ...cursor.raw().toArray()];
  }
  async run() {
    const started = performance.now();
    const cursor = this.storage.sql.exec(this.sql, ...this.args);
    const results = cursor.toArray();
    // rowsWritten includes index work. Prisma requires actual affected table rows.
    const changes = this.storage.sql.exec("SELECT changes() AS n").one().n;
    return { success: true, results, meta: { changes, duration: performance.now() - started } };
  }
}

export function sqliteQueryBridge(storage) {
  return {
    prepare: (sql) => new Statement(storage, sql),
    exec: async () => {
      throw new Error("Schema scripts must run through the native migration transaction.");
    },
  };
}
