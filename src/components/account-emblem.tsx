/** The signed-in player's Discord picture as a page emblem; the page's painted emblem when there is none. */
export function AccountEmblem({
  image,
  fallback = "team-roles",
}: {
  image?: string | null;
  /** Painted emblem in public/albion/icons for a player without a picture. */
  fallback?: string;
}) {
  if (!image)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="painted-emblem"
        src={`/albion/icons/${fallback}.webp`}
        alt=""
        width={64}
        height={64}
      />
    );
  return (
    // Discord profile imagery belongs to the signed-in user; never a synthetic avatar.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="account-emblem"
      src={image}
      alt=""
      width={60}
      height={60}
      referrerPolicy="no-referrer"
    />
  );
}
