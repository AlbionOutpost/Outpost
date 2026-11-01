import { Play, Sparkles } from "lucide-react";
import type { AwakeningTrait, LibraryBuild } from "@/lib/grind-library-types";

export function safeYouTubeLink(value: string) {
  return /^https:\/\/www\.youtube\.com\/(?:watch\?v=[a-zA-Z0-9_-]{11}|@[a-zA-Z0-9_.-]{1,100}|(?:channel|user|c)\/[a-zA-Z0-9_-]{1,100})$/.test(
    value,
  );
}

export function LibraryBuildTraits({ ids, traits }: { ids: string[]; traits: AwakeningTrait[] }) {
  if (!ids.length) return null;
  return (
    <section className="library-build-traits" aria-label="Recorded awakening recommendations">
      <div className="library-section-heading">
        <h2>
          <Sparkles size={17} /> Recommended traits
        </h2>
        <span>Author recommendations</span>
      </div>
      <div className="library-trait-grid">
        {ids.map((id) => {
          const trait = traits.find((t) => t.id === id);
          return (
            <article key={id} className="library-trait-card">
              <h3>{trait?.name || id}</h3>
              {trait ? (
                <>
                  <span className="library-trait-rarity" data-rarity={trait.rarity}>
                    {trait.rarity}
                  </span>
                  <p>
                    <b>Recorded range:</b> {trait.range}
                  </p>
                  <p>
                    <b>Weapons:</b> {trait.weapons}
                  </p>
                </>
              ) : (
                <p>Trait details are unavailable.</p>
              )}
            </article>
          );
        })}
      </div>
      <p className="library-trait-source">
        Historical awakening reference values. These are recommendations, not this weapon’s actual
        rolled traits or current-patch verification.
      </p>
    </section>
  );
}

export function LibraryBuildVideos({ build }: { build: LibraryBuild }) {
  const links = build.videos.filter((v) => safeYouTubeLink(v.url));
  if (!links.length && !build.unresolvedVideoReferences) return null;
  return (
    <section className="library-build-videos">
      <h2>Watch the creator’s recordings</h2>
      <div>
        {links.map((video, i) => (
          <a key={`${video.url}-${i}`} href={video.url} target="_blank" rel="noopener noreferrer">
            <Play size={18} />
            <span>
              {video.kind === "channel"
                ? "Creator’s YouTube channel"
                : `Recorded build video ${i + 1}`}
              <small>Open on YouTube ↗</small>
            </span>
          </a>
        ))}
      </div>
      {!!build.unresolvedVideoReferences && (
        <p>Some original video references were incomplete and could not be linked.</p>
      )}
    </section>
  );
}
