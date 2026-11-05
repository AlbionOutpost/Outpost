export type AccessSnapshot = {
  bannedAt?: Date | string | null;
  bannedUntil?: Date | string | null;
};
export function accountBanned(user: AccessSnapshot | null | undefined, now = Date.now()) {
  return !!user?.bannedAt && (!user.bannedUntil || new Date(user.bannedUntil).getTime() > now);
}
export function giftedSupporter(
  user:
    | { supporterGiftPermanent?: boolean; supporterGiftUntil?: Date | string | null }
    | null
    | undefined,
  now = Date.now(),
) {
  return (
    !!user?.supporterGiftPermanent ||
    (!!user?.supporterGiftUntil && new Date(user.supporterGiftUntil).getTime() > now)
  );
}
