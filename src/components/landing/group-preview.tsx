import { ItemIcon } from "@/components/item-icon";
import Link from "@/components/link";
import type { LibraryBuild, LibraryComposition } from "@/lib/grind-library-types";
import { activityName } from "@/lib/grind-library-types";
import { roles } from "@/lib/compositions/roles";

/**
 * One public group build from the library: its real members, which are required and which
 * are optional, and the roles the composition editor lets a group assign. Roles are not
 * recorded in the library, so none are shown as assigned.
 */
export function GroupPreview({
  composition,
  members,
  suffix,
}: {
  composition: LibraryComposition;
  members: LibraryBuild[];
  suffix: string;
}) {
  const required = composition.members.filter((id) => !composition.optional.includes(id)).length;
  const optional = composition.members.length - required;
  const lookup = new Map(members.map((b) => [b.id, b]));
  const editorRoles = roles.filter((r) => r !== "Custom").slice(0, 7);
  return (
    <div className="group-preview">
      <div className="group-preview-title">
        <strong>{composition.title}</strong>
        <span>
          {activityName(composition.category)} · {composition.members.length} members · {required}{" "}
          required{optional ? `, ${optional} optional` : ""} · by {composition.author}
        </span>
      </div>
      <ol className="group-preview-members" aria-label="Members">
        {composition.members.map((id, index) => {
          const build = lookup.get(id);
          const main = build?.equipment.find((e) => e.slot === "Main hand");
          const isOptional = composition.optional.includes(id);
          return (
            <li key={`${id}-${index}`} className={isOptional ? "is-optional" : undefined}>
              <span className="group-preview-icon" aria-hidden="true">
                {main ? <ItemIcon id={main.itemId} size={32} /> : null}
              </span>
              {build ? (
                <Link
                  href={`/builds/library/${encodeURIComponent(build.slug)}${suffix}`}
                  className="group-preview-build"
                >
                  <strong>{build.weaponName}</strong>
                  <span>{build.title}</span>
                </Link>
              ) : (
                <span className="group-preview-build">
                  <strong>Loadout unavailable</strong>
                </span>
              )}
              <span className="group-preview-flag">{isOptional ? "Optional" : "Required"}</span>
            </li>
          );
        })}
      </ol>
      {optional > 0 && (
        <p className="group-preview-more">
          + {optional} optional {optional === 1 ? "member" : "members"} listed in the full group
          build.
        </p>
      )}
      <div className="group-preview-roles">
        <span className="build-preview-label">Roles you assign in the editor</span>
        <ul aria-label="Composition roles">
          {editorRoles.map((role) => (
            <li key={role}>{role}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
