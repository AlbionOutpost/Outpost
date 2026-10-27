import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await db.user.findUnique({
    where: { id },
    select: {
      name: true,
      createdAt: true,
      builds: {
        where: { visibility: "PUBLIC", hiddenAt: null },
        select: { id: true, title: true },
        take: 25,
        orderBy: { updatedAt: "desc" },
      },
      compositions: {
        where: { visibility: "PUBLIC", hiddenAt: null },
        select: { id: true, title: true },
        take: 25,
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!u) notFound();
  return (
    <>
      <div className="eyebrow">OUTPOST COMMUNITY PROFILE</div>
      <h1 className="page-title display-title">{u.name || "Adventurer"}</h1>
      <p>
        Outpost member since {u.createdAt.toISOString().slice(0, 10)}. This profile does not verify
        ownership of an Albion character.
      </p>
      <section className="panel">
        <h2>Recent public builds</h2>
        {u.builds.map((b) => (
          <p key={b.id}>
            <Link className="text-link" href={`/builds/${b.id}`}>
              {b.title}
            </Link>
          </p>
        ))}
        <h2 className="section">Recent public comps</h2>
        {u.compositions.map((c) => (
          <p key={c.id}>
            <Link className="text-link" href={`/compositions/${c.id}`}>
              {c.title}
            </Link>
          </p>
        ))}
      </section>
    </>
  );
}
