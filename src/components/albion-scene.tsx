import Image from "next/image";
import Link from "next/link";
import { albionScenes, type SceneKey } from "@/lib/albion/assets";
export function AlbionScene({ asset, hero = false }: { asset: SceneKey; hero?: boolean }) {
  const image = albionScenes[asset];
  return (
    <div
      className={`albion-scene${hero ? " hero-scene" : ""}`}
      data-asset={asset}
      data-asset-status={image.status}
    >
      {image.status !== "missing" ? (
        <Image
          unoptimized
          src={image.src}
          alt={image.alt}
          fill
          sizes={hero ? "100vw" : "(max-width:780px) 100vw, 33vw"}
          preload={hero}
          style={{ objectFit: "cover", objectPosition: image.focalPoint }}
        />
      ) : (
        <div
          className="missing-scene"
          role="img"
          aria-label={`${image.title}: authentic screenshot unavailable`}
        >
          <span className="missing-scene-label">{image.title}</span>
          <span>Approved game screenshot needed</span>
        </div>
      )}
      {hero && image.status === "generated" && (
        <Link className="scene-provenance" href="/legal#scene-artwork">
          Illustrated scenes
        </Link>
      )}
    </div>
  );
}
