// Only these runtime symbols are used by the website. Prisma model types remain type-only.
// The actual generated SQLite client belongs to the private data Worker, not the browser/site bundle.
class PrismaClientKnownRequestError extends Error {
  constructor(
    message: string,
    public details: { code: string; clientVersion: string },
  ) {
    super(message);
  }
  get code() {
    return this.details.code;
  }
}
export const Prisma = {
  PrismaClientKnownRequestError,
  TransactionIsolationLevel: { Serializable: "Serializable", RepeatableRead: "RepeatableRead" },
};
