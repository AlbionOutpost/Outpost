/** The signed-in player's Discord picture as a page emblem; the gear emblem when there is none. */
export function AccountEmblem({ image }: { image?: string | null }) {
  if (!image)
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        className="painted-emblem"
        src="/albion/icons/team-roles.webp"
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
