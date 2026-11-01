import Image from "next/image";

export function DiscordMark() {
  return (
    <Image
      className="discord-mark"
      src="/brand/discord-symbol.svg"
      alt=""
      width={24}
      height={18}
      unoptimized
      aria-hidden="true"
    />
  );
}
