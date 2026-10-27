import { expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { retrySerialization } from "../src/lib/serialization-retry";
const rolledBack = () =>
  new Prisma.PrismaClientKnownRequestError("Transaction rolled back", {
    code: "P2034",
    clientVersion: "6.19.3",
  });
it("retries confirmed rolled-back conflicts and returns one successful result", async () => {
  const operation = vi
    .fn()
    .mockRejectedValueOnce(rolledBack())
    .mockRejectedValueOnce(rolledBack())
    .mockResolvedValue({ version: 2 });
  expect(await retrySerialization(operation)).toEqual({ version: 2 });
  expect(operation).toHaveBeenCalledTimes(3);
});
it("bounds repeated serialization conflicts to three attempts", async () => {
  const error = rolledBack(),
    operation = vi.fn().mockRejectedValue(error);
  await expect(retrySerialization(operation)).rejects.toBe(error);
  expect(operation).toHaveBeenCalledTimes(3);
});
it("does not retry genuine revision conflicts or ambiguous failures", async () => {
  for (const error of [
    new Error("Revision conflict"),
    new Prisma.PrismaClientKnownRequestError("Timeout", { code: "P2028", clientVersion: "6.19.3" }),
  ]) {
    const operation = vi.fn().mockRejectedValue(error);
    await expect(retrySerialization(operation)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  }
});
