import { expect, it, vi } from "vitest";
import { databaseContext, db } from "../cloudflare/database/context";

it("normalizes private service transaction filters while retaining JSON data and dates", async () => {
  const findMany = vi.fn().mockResolvedValue([]),
    create = vi.fn().mockResolvedValue({ id: "copy" });
  const date = new Date("2026-01-01T00:00:00Z"),
    data = {
      snapshot: { mode: "insensitive", notes: "Author mode stays intact" },
      createdAt: date,
      equipmentSets: [{ name: "mode", equipment: [] }],
    };
  await databaseContext.run({ build: { findMany, create } }, async () => {
    await db.$transaction(async (tx) => {
      await tx.build.findMany({
        where: { title: { contains: "AXE", mode: "insensitive" } },
        include: {
          favorites: { where: { user: { name: { contains: "USER", mode: "insensitive" } } } },
        },
      });
      await tx.build.create({ data: data as never });
    });
  });
  expect(findMany).toHaveBeenCalledWith({
    where: { title: { contains: "AXE" } },
    include: { favorites: { where: { user: { name: { contains: "USER" } } } } },
  });
  const persisted = create.mock.calls[0][0].data;
  expect(persisted).toBe(data);
  expect(persisted.snapshot.mode).toBe("insensitive");
  expect(persisted.createdAt).toBe(date);
  expect(() => db.build).toThrow("outside private transaction context");
});
