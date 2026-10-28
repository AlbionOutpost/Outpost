import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "@/components/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
export default async function Favorites() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/signin");
  const userId = s.user.id;
  const [builds, compositions] = await Promise.all([
    db.buildFavorite.findMany({
      where: {
        userId,
        build: {
          hiddenAt: null,
          OR: [{ visibility: { in: ["PUBLIC", "UNLISTED"] } }, { authorId: userId }],
        },
      },
      take: 100,
      orderBy: { createdAt: "desc" },
      select: { build: { select: { id: true, title: true } } },
    }),
    db.compositionFavorite.findMany({
      where: {
        userId,
        composition: {
          hiddenAt: null,
          OR: [
            { visibility: "PUBLIC" },
            { visibility: "PRIVATE", authorId: userId },
            { visibility: "GROUP", group: { members: { some: { userId } } } },
          ],
        },
      },
      take: 100,
      orderBy: { createdAt: "desc" },
      select: { composition: { select: { id: true, title: true } } },
    }),
  ]);
  return (
    <>
      <h1 className="page-title display-title">Favorites</h1>
      <p>
        Your saved builds and comps, up to 100 of each. Content you can no longer access is hidden.
      </p>
      <section className="panel">
        <h2>Builds</h2>
        {builds.map(({ build: b }) => (
          <p key={b.id}>
            <Link className="text-link" href={`/builds/${b.id}`}>
              {b.title}
            </Link>
          </p>
        ))}
        {!builds.length && (
          <div className="collection-empty">
            <p>No saved builds you can access yet.</p>
            <Link className="text-link" href="/builds">
              Browse community builds →
            </Link>
          </div>
        )}
        <h2 className="section">Comps</h2>
        {compositions.map(({ composition: c }) => (
          <p key={c.id}>
            <Link className="text-link" href={`/compositions/${c.id}`}>
              {c.title}
            </Link>
          </p>
        ))}
        {!compositions.length && (
          <div className="collection-empty">
            <p>No saved comps you can access yet.</p>
            <Link className="text-link" href="/compositions">
              Browse comps →
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
