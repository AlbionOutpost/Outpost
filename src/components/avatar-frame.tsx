import type { CSSProperties } from "react";
import { avatarFrames, resolveAvatarFrame } from "@/lib/avatar-frames";
import styles from "./avatar-frame.module.css";

/**
 * A player's picture in the frame they picked in Settings (`src/lib/avatar-frames.ts`), or the
 * plain picture when they picked none. Without a Discord picture (and everywhere other players
 * see it) the face is the name's initial. Decorative: the name always sits beside it.
 */
export function AvatarFrame({
  frame,
  size,
  image,
  name,
}: {
  frame?: string | null;
  /** Outer size in px, ring included. */
  size: number;
  /** The signed-in player's own Discord picture; never another player's. */
  image?: string | null;
  name?: string | null;
}) {
  const id = resolveAvatarFrame(frame);
  const art = id ? (avatarFrames[id] as { image?: string }).image : undefined;
  return (
    <span
      className={styles.frame}
      data-avatar-frame={id ?? "none"}
      data-art={art ? "" : undefined}
      data-small={size < 44 ? "" : undefined}
      style={{ "--size": `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      {image ? (
        // Discord profile imagery belongs to the signed-in user; never a synthetic avatar.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.face}
          src={image}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className={styles.face}>{(name?.trim() || "A").slice(0, 1).toUpperCase()}</span>
      )}
      {art && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.art} src={art} alt="" width={size} height={size} />
      )}
    </span>
  );
}

/** Settings: every frame drawn around the player's own picture, as a labelled radio group. */
export function AvatarFramePicker({
  value,
  onChange,
  image,
  name,
}: {
  value: string;
  onChange: (frame: string) => void;
  image?: string | null;
  name?: string | null;
}) {
  const options = [
    ["none", "None"],
    ...Object.entries(avatarFrames).map(([id, frame]) => [id, frame.label]),
  ];
  return (
    <fieldset className={styles.picker} aria-describedby="avatar-frame-hint">
      <legend>Picture frame</legend>
      <div className={styles.options}>
        {options.map(([id, label]) => (
          <label className={styles.option} key={id}>
            <input
              type="radio"
              name="avatarFrame"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            <AvatarFrame frame={id} size={64} image={image} name={name} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <p className={styles.hint} id="avatar-frame-hint">
        Shown around your picture in the header, on your profile, on your comments and in your
        Teams.
      </p>
    </fieldset>
  );
}
