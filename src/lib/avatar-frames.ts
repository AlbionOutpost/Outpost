/**
 * Profile picture frames a player can pick in Settings. A frame is either drawn in CSS
 * (`avatar-frame.module.css`, keyed by its id) or an owner-supplied transparent PNG under
 * `public/albion/frames/` laid over the picture: add `{ label, image: "/albion/frames/<id>.png" }`.
 * The ids are the server-side allow-list (settings action); null is the plain picture.
 */
export const avatarFrames = {
  bronze: { label: "Bronze" },
  silver: { label: "Silver" },
  gold: { label: "Gold" },
  crystal: { label: "Crystal" },
} satisfies Record<string, { label: string; image?: `/albion/frames/${string}.png` }>;

export type AvatarFrameId = keyof typeof avatarFrames;
export const avatarFrameIds = Object.keys(avatarFrames) as [AvatarFrameId, ...AvatarFrameId[]];

/** A stored value as a known frame, or null (plain) for anything unknown or retired. */
export const resolveAvatarFrame = (value?: string | null): AvatarFrameId | null =>
  value && Object.hasOwn(avatarFrames, value) ? (value as AvatarFrameId) : null;
