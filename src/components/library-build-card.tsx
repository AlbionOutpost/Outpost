import Link from "@/components/link";
import { ItemIcon } from "./item-icon";
import { activityName, type LibraryBuild } from "@/lib/grind-library-types";
export function LibraryBuildCard({ build }: { build: LibraryBuild }) {
  const main = build.equipment.find((row) => row.slot === "Main hand");
  return (
    <article className="library-build-card">
      <Link href={`/builds/library/${encodeURIComponent(build.slug)}`}>
        <div className="library-build-identity">
          {main && <ItemIcon id={main.itemId} size={72} />}
          <div>
            <span>{activityName(build.category)}</span>
            <h2>{build.title}</h2>
            <small>By {build.author}</small>
          </div>
        </div>
        <div className="library-build-equipment" aria-label="Recorded equipment">
          {build.equipment
            .filter((row) => row.slot !== "Main hand")
            .map((row) => (
              <span key={row.slot} title={row.slot}>
                <ItemIcon id={row.itemId} size={40} />
                <span className="sr-only">
                  {row.slot}: {row.itemId}
                </span>
              </span>
            ))}
        </div>
        <div className="library-card-caption">
          <span>{build.weaponName || "Equipment plan"}</span>
          <span>Grind archive</span>
        </div>
      </Link>
    </article>
  );
}
