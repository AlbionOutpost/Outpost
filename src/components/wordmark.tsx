import Image from "next/image";

export function Wordmark({ priority = false }: { priority?: boolean }) {
  return (
    <span className="outpost-wordmark">
      <Image
        className="outpost-logo"
        src="/brand/outpost-logo.webp"
        alt="Outpost"
        width={640}
        height={213}
        priority={priority}
        sizes="(max-width: 780px) 188px, 212px"
      />
    </span>
  );
}
