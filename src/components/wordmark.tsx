import Image from "next/image";

export function Wordmark() {
  return (
    <span className="outpost-wordmark">
      <Image
        className="outpost-logo"
        src="/brand/outpost-logo.png"
        alt="Outpost"
        width={2172}
        height={724}
        sizes="(max-width: 780px) 188px, 212px"
      />
    </span>
  );
}
