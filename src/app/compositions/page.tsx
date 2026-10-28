import Link from "@/components/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@/lib/prisma-runtime";
import { memberSlot } from "@/lib/compositions/validation";
import { MobileFilterPanel } from "@/components/mobile-filter-panel";
import { ItemIcon } from "@/components/item-icon";
import { EquipmentGlyph } from "@/components/equipment-overview";
import { equipmentName } from "@/lib/albion/equipment-catalog";
export default async function Compositions({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mine?: string; page?: string }>;
}) {
  const p = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const page = z.coerce.number().int().min(1).max(1000).catch(1).parse(p.page);
  const q = (p.q || "").slice(0, 100);
  const rows = await db.$transaction(
    (tx) =>
      tx.composition.findMany({
        where: {
          hiddenAt: null,
          AND: [
            {
              OR: [
                { visibility: "PUBLIC" },
                ...(userId
                  ? [
                      { authorId: userId, visibility: "PRIVATE" as const },
                      { visibility: "GROUP" as const, group: { members: { some: { userId } } } },
                    ]
                  : []),
              ],
            },
            ...(p.mine === "1" ? [{ authorId: userId || "__anonymous__" }] : []),
            ...(q ? [{ title: { contains: q, mode: "insensitive" as const } }] : []),
          ],
        },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 25,
        skip: (page - 1) * 24,
        select: {
          id: true,
          title: true,
          description: true,
          visibility: true,
          contentType: true,
          version: true,
          updatedAt: true,
          slots: true,
          author: { select: { name: true } },
        },
      }),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  return (
    <div className="composition-directory">
      <div className="section-heading composition-directory-heading">
        <h1 className="page-title display-title">Comps</h1>
        <Link className="button primary" href="/compositions/new">
          Create comp
        </Link>
      </div>
      <p className="intro">
        Plan roles, assign players and share gear for your next party. Your private and guild comps
        stay protected.
      </p>
      <form className="panel composition-filters">
        <label>
          Search comp titles
          <input name="q" defaultValue={q} maxLength={100} />
        </label>
        <MobileFilterPanel label={p.mine === "1" ? "Collection: My comps" : "Collection filters"}>
          <label>
            Collection
            <select aria-label="Comp collection" name="mine" defaultValue={p.mine || "0"}>
              <option value="0">Available comps</option>
              <option value="1">My comps</option>
            </select>
          </label>
        </MobileFilterPanel>
        <button className="button secondary" aria-label="Search comps">
          Search
        </button>
      </form>
      <section className="tool-grid section composition-results" aria-label="Matching comps">
        {rows.slice(0, 24).map((r) => {
          const slots = Array.isArray(r.slots) ? r.slots : null;
          const preview = (slots || []).slice(0, 10).flatMap((value) => {
            const parsed = memberSlot.safeParse(value);
            if (!parsed.success) return [];
            const main = parsed.data.equipment.find((e) => e.slot === "Main hand");
            return [{ main, memberId: parsed.data.id, role: parsed.data.role }];
          });
          return (
            <Link
              className="tool-card composition-preview-card"
              href={`/compositions/${r.id}`}
              key={r.id}
            >
              <div className="loadout-card-heading">
                <h2>{r.title}</h2>
                <span className="loadout-activity">
                  {r.contentType} ·{" "}
                  {{ PUBLIC: "Public", PRIVATE: "Private", GROUP: "Guild only" }[r.visibility]}
                </span>
              </div>
              <span className="composition-roster-preview" aria-label="Recorded roster preview">
                {slots ? (
                  <strong>
                    {slots.length} {slots.length === 1 ? "player" : "players"}
                  </strong>
                ) : (
                  <span>Roster unavailable</span>
                )}
                {preview.map((item) => (
                  <span
                    className="comp-preview-player"
                    key={item.memberId}
                    title={`${item.role} · ${item.main ? equipmentName(item.main.itemId) : "No weapon assigned"}`}
                  >
                    {item.main ? (
                      <ItemIcon id={item.main.itemId} quality={item.main.quality} size={44} />
                    ) : (
                      <EquipmentGlyph slot="Main hand" />
                    )}
                    <small>{item.role}</small>
                  </span>
                ))}
                {slots && slots.length > 10 && (
                  <span className="comp-preview-more">+{slots.length - 10} players</span>
                )}
              </span>
              <p>{r.description.slice(0, 200)}</p>
              <div className="card-footer">
                {r.author.name || "Adventurer"} · Revision {r.version}
              </div>
            </Link>
          );
        })}
      </section>
      {!rows.length && (
        <section className="panel empty">
          No accessible comps found. Create your own roster or ask a group officer to share one.
        </section>
      )}
      <div className="actions section">
        {page > 1 && (
          <Link
            className="button secondary"
            href={`/compositions?q=${encodeURIComponent(q)}&mine=${p.mine || 0}&page=${page - 1}`}
          >
            Previous page
          </Link>
        )}
        {rows.length > 24 && (
          <Link
            className="button secondary"
            href={`/compositions?q=${encodeURIComponent(q)}&mine=${p.mine || 0}&page=${page + 1}`}
          >
            Next page
          </Link>
        )}
      </div>
    </div>
  );
}
