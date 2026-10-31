import Image from "next/image";

/**
 * The Outpost wordmark: banner and lettering. Cream lettering on the dark theme, near-black
 * lettering on the light theme (both owner-supplied, tightly cropped, 913×331).
 */
export function Wordmark({
  priority = false,
  light = false,
}: {
  priority?: boolean;
  light?: boolean;
}) {
  return (
    <span className="outpost-wordmark">
      <Image
        className="outpost-logo"
        src={light ? "/brand/outpost-logo-light.webp" : "/brand/outpost-logo-dark.webp"}
        alt="Outpost"
        width={913}
        height={331}
        priority={priority}
        sizes="(max-width: 780px) 120px, 160px"
      />
    </span>
  );
}
