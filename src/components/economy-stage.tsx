"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { AvatarFrame } from "./avatar-frame";
import styles from "./team-economy.module.css";

/**
 * The Team economy's 3D moments, drawn with CSS 3D transforms and moved with the Web Animations
 * API: a coin flip, a d100 number drum and a loot chest that throws silver to each member.
 * Every one of them only shows a result the server already decided; with reduced motion the
 * result is simply there.
 */

export function prefersReducedMotion() {
  return typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export const silverText = (n: number) => n.toLocaleString("en");

/** Counts a number up (or down) to `value`; jumps straight there under reduced motion. */
export function useCountUp(
  value: number,
  { duration = 900, from }: { duration?: number; from?: number } = {},
) {
  const [shown, setShown] = useState(from ?? value);
  const last = useRef(from ?? value);
  useEffect(() => {
    const start = last.current;
    last.current = value;
    if (start === value || prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return shown;
}

/* ------------------------------------------------------------------------------------------ */
/* Coin                                                                                        */
/* ------------------------------------------------------------------------------------------ */

const edgeLayers = Array.from({ length: 9 }, (_, i) => i - 4);
const turns = 5;
const sideAngle = (side: "heads" | "tails") => (side === "tails" ? 180 : 0);

/**
 * A two-faced silver coin (the crown is heads, the skull tails). Give it a `flip` — the side the
 * server landed and a key per throw — and it is tossed in an arc, spins and settles on that side.
 */
export function Coin3D({
  flip,
  size = 132,
  still = false,
  onLanded,
}: {
  flip: { side: "heads" | "tails"; key: string } | null;
  size?: number;
  /** Show the landed side at rest, without a throw. */
  still?: boolean;
  onLanded?: () => void;
}) {
  const lift = useRef<HTMLDivElement>(null);
  const coin = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const wobble = useRef<HTMLDivElement>(null);
  const resting = useRef(0);
  const landed = useRef(onLanded);
  useLayoutEffect(() => {
    landed.current = onLanded;
  });
  // Keyed by the throw, not the object, so a re-render never throws the coin again.
  const side = flip?.side;
  const throwKey = flip?.key;
  useEffect(() => {
    const el = coin.current;
    if (!side || !throwKey || !el || !lift.current || !shadow.current || !wobble.current) return;
    const from = resting.current;
    const base = Math.ceil(from / 360) * 360;
    const to = base + turns * 360 + sideAngle(side);
    resting.current = to;
    if (still || prefersReducedMotion()) {
      el.style.transform = `rotateX(${to}deg)`;
      landed.current?.();
      return;
    }
    const height = size * 1.2;
    const duration = 1900;
    const animations = [
      lift.current.animate(
        [
          { transform: "translate3d(0,0,0) scale(1)", easing: "cubic-bezier(.2,.75,.35,1)" },
          {
            transform: `translate3d(0,${-height}px,${size * 0.6}px) scale(1.04)`,
            offset: 0.42,
            easing: "cubic-bezier(.55,0,.85,.4)",
          },
          {
            transform: "translate3d(0,0,0) scale(1)",
            offset: 0.8,
            easing: "cubic-bezier(.2,.7,.4,1)",
          },
          {
            transform: `translate3d(0,${-size * 0.12}px,0) scale(1)`,
            offset: 0.89,
            easing: "cubic-bezier(.5,0,.8,.5)",
          },
          { transform: "translate3d(0,0,0) scale(1)" },
        ],
        { duration },
      ),
      el.animate(
        [
          { transform: `rotateX(${from}deg)` },
          { transform: `rotateX(${to - 50}deg)`, offset: 0.8, easing: "cubic-bezier(.3,.6,.4,1)" },
          { transform: `rotateX(${to}deg)` },
        ],
        { duration, easing: "cubic-bezier(.18,.6,.3,1)", fill: "forwards" },
      ),
      shadow.current.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(.45)", offset: 0.42 },
          { transform: "scale(1)", offset: 0.8 },
          { transform: "scale(.88)", offset: 0.89 },
          { transform: "scale(1)" },
        ],
        { duration },
      ),
      wobble.current.animate(
        [
          { transform: "rotateY(0deg) rotateZ(0deg)" },
          { transform: "rotateY(0deg) rotateZ(-6deg)", offset: 0.4 },
          { transform: "rotateY(0deg) rotateZ(0deg)", offset: 0.8 },
          { transform: "rotateY(9deg) rotateZ(2deg)", offset: 0.86 },
          { transform: "rotateY(-5deg) rotateZ(-1deg)", offset: 0.93 },
          { transform: "rotateY(0deg) rotateZ(0deg)" },
        ],
        { duration },
      ),
    ];
    let done = false;
    animations[1].finished
      .then(() => {
        if (done) return;
        el.style.transform = `rotateX(${to}deg)`;
        animations[1].cancel();
        landed.current?.();
      })
      .catch(() => {});
    return () => {
      done = true;
      animations.forEach((a) => a.cancel());
      el.style.transform = `rotateX(${to}deg)`;
    };
  }, [side, throwKey, size, still]);
  return (
    <div
      className={styles.coinStage}
      style={{ "--coin": `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <div ref={shadow} className={styles.coinShadow} />
      <div ref={lift} className={styles.coinLift}>
        <div ref={wobble} className={styles.coinTilt}>
          <div ref={coin} className={styles.coin}>
            <div className={styles.coinFace} data-side="heads">
              {/* eslint-disable-next-line @next/next/no-img-element -- painted charge */}
              <img src="/albion/charges/crown.webp" alt="" />
            </div>
            {edgeLayers.map((z) => (
              <div
                key={z}
                className={styles.coinEdge}
                style={{ transform: `translateZ(calc(var(--coin) * ${z / 120}))` }}
              />
            ))}
            <div className={styles.coinFace} data-side="tails">
              {/* eslint-disable-next-line @next/next/no-img-element -- painted charge */}
              <img src="/albion/charges/skull.webp" alt="" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* d100 number drum                                                                            */
/* ------------------------------------------------------------------------------------------ */

const tensFaces = ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const onesFaces = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function Reel({
  faces,
  index,
  spin,
  delay,
  onDone,
}: {
  faces: string[];
  index: number;
  spin: string | null;
  delay: number;
  onDone?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const angle = 360 / faces.length;
  const at = useRef(0);
  const done = useRef(onDone);
  useLayoutEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const reel = ref.current;
    if (!reel) return;
    const from = at.current;
    const to = Math.ceil(from / 360) * 360 + (spin ? 3 * 360 : 0) + index * angle;
    at.current = to;
    if (!spin || prefersReducedMotion()) {
      reel.style.transform = `rotateX(${to}deg)`;
      if (spin) done.current?.();
      return;
    }
    const animation = reel.animate(
      [
        { transform: `rotateX(${from}deg)` },
        { transform: `rotateX(${to + angle * 0.35}deg)`, offset: 0.86 },
        { transform: `rotateX(${to}deg)` },
      ],
      { duration: 1250 + delay, delay: 0, easing: "cubic-bezier(.15,.55,.25,1)", fill: "forwards" },
    );
    animation.finished
      .then(() => {
        reel.style.transform = `rotateX(${to}deg)`;
        animation.cancel();
        done.current?.();
      })
      .catch(() => {});
    return () => animation.cancel();
  }, [spin, index, angle, delay]);
  return (
    <div className={styles.reel} style={{ "--faces": faces.length } as CSSProperties}>
      <div ref={ref} className={styles.reelDrum}>
        {faces.map((face, i) => (
          <span
            key={i}
            className={styles.reelFace}
            style={{ "--i": i, "--angle": `${angle}deg` } as CSSProperties}
          >
            {face}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A d100 shown as two number drums that tumble and land on the server's roll. */
export function RollDrum({
  value,
  spin,
  onLanded,
}: {
  value: number | null;
  /** A key per new roll to tumble to; null shows the value at rest. */
  spin: string | null;
  onLanded?: () => void;
}) {
  const v = value ?? 0;
  return (
    <div className={styles.drum} aria-hidden="true" data-empty={value === null ? "" : undefined}>
      <Reel faces={tensFaces} index={Math.floor(v / 10)} spin={spin} delay={0} />
      <Reel faces={onesFaces} index={v % 10} spin={spin} delay={450} onDone={onLanded} />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Loot chest reveal                                                                           */
/* ------------------------------------------------------------------------------------------ */

export type RevealPayout = {
  userId: string | null;
  name: string;
  frame?: string | null;
  silver: number;
  note?: string;
};

function PayoutCard({ row, start }: { row: RevealPayout; start: boolean }) {
  const shown = useCountUp(start ? row.silver : 0, { duration: 1100, from: 0 });
  return (
    <li
      className={styles.payoutCard}
      data-userid={row.userId ?? "pot"}
      data-lit={start ? "" : undefined}
    >
      {row.userId ? (
        <AvatarFrame frame={row.frame} size={48} name={row.name} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- painted emblem for the pot
        <img className={styles.potMark} src="/albion/icons/team-loot-64w.webp" alt="" />
      )}
      <span className={styles.payoutName}>
        <strong>{row.name}</strong>
        {row.note && <small>{row.note}</small>}
      </span>
      <span className={styles.payoutSilver}>
        {/* eslint-disable-next-line @next/next/no-img-element -- painted silver */}
        <img src="/albion/icons/silver-64w.webp" alt="" />
        <data value={row.silver} aria-hidden="true">
          {silverText(shown)}
        </data>
        <span className="sr-only">{silverText(row.silver)} silver</span>
      </span>
    </li>
  );
}

/**
 * The chest scene: the lid springs open, light spills out and silver coins arc to every
 * member's card while their share counts up. Plays once on mount.
 */
export function LootChestReveal({ rows, total }: { rows: RevealPayout[]; total: number }) {
  const scene = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [lit, setLit] = useState<Set<string>>(() => new Set());
  const sum = useCountUp(opened ? total : 0, { duration: 1400, from: 0 });
  useEffect(() => {
    const root = scene.current;
    if (!root) return;
    const all = new Set(rows.map((r) => r.userId ?? "pot"));
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(() => {
        setOpened(true);
        setLit(all);
      });
      return () => cancelAnimationFrame(id);
    }
    const timers: number[] = [];
    const flights: Animation[] = [];
    timers.push(window.setTimeout(() => setOpened(true), 450));
    const mouth = root.querySelector<HTMLElement>('[data-face="inside"]');
    const layer = root.querySelector<HTMLElement>(`.${styles.coinLayer}`);
    timers.push(
      window.setTimeout(() => {
        if (!mouth || !layer) return;
        const origin = mouth.getBoundingClientRect();
        const base = layer.getBoundingClientRect();
        const ox = origin.left + origin.width / 2 - base.left;
        const oy = origin.top + origin.height / 2 - base.top;
        // Up to six coins per card, never more than 72 in the air.
        const perCard = Math.max(2, Math.min(6, Math.floor(72 / Math.max(rows.length, 1))));
        rows.forEach((row, cardIndex) => {
          const id = row.userId ?? "pot";
          const card = root.querySelector<HTMLElement>(
            `[data-userid="${CSS.escape(id)}"] .${styles.payoutSilver} img`,
          );
          if (!card) return;
          const target = card.getBoundingClientRect();
          const tx = target.left + target.width / 2 - base.left;
          const ty = target.top + target.height / 2 - base.top;
          for (let c = 0; c < perCard; c++) {
            const coin = document.createElement("span");
            coin.className = styles.flyingCoin;
            layer.appendChild(coin);
            const spread = (c - perCard / 2) * 9;
            const peak = Math.min(oy, ty) - 90 - ((cardIndex * 37 + c * 23) % 60);
            const delay = cardIndex * 110 + c * 70;
            const flight = coin.animate(
              [
                { transform: `translate(${ox + spread * 0.4}px, ${oy}px) scale(.5) rotate(0deg)` },
                {
                  transform: `translate(${(ox + tx) / 2 + spread}px, ${peak}px) scale(1.15) rotate(${180 + c * 40}deg)`,
                  offset: 0.45,
                },
                { transform: `translate(${tx}px, ${ty}px) scale(.55) rotate(${400 + c * 50}deg)` },
              ],
              {
                duration: 900 + (c % 3) * 80,
                delay,
                easing: "cubic-bezier(.3,.1,.4,1)",
                fill: "both",
              },
            );
            flights.push(flight);
            flight.finished
              .then(() => {
                coin.remove();
                if (c === 0) setLit((prev) => new Set(prev).add(id));
              })
              .catch(() => coin.remove());
          }
        });
      }, 900),
    );
    return () => {
      timers.forEach((t) => clearTimeout(t));
      flights.forEach((f) => f.cancel());
      layer?.replaceChildren();
    };
  }, [rows]);
  return (
    <div ref={scene} className={styles.revealScene}>
      <div className={styles.chestStage} aria-hidden="true">
        <div className={styles.chestGlow} data-open={opened ? "" : undefined} />
        <div className={styles.chest} data-open={opened ? "" : undefined}>
          <div className={styles.chestBody}>
            <span data-face="front" />
            <span data-face="back" />
            <span data-face="left" />
            <span data-face="right" />
            <span data-face="bottom" />
            <span data-face="inside" />
          </div>
          <div className={styles.chestLid}>
            <span data-face="front" />
            <span data-face="back" />
            <span data-face="left" />
            <span data-face="right" />
            <span data-face="top" />
          </div>
        </div>
      </div>
      <p className={styles.revealTotal}>
        {/* eslint-disable-next-line @next/next/no-img-element -- painted silver */}
        <img src="/albion/icons/silver-64w.webp" alt="" />
        <data value={total} aria-hidden="true">
          {silverText(sum)}
        </data>
        <small>
          <span className="sr-only">{silverText(total)}</span> silver shared
        </small>
      </p>
      <ul className={styles.payoutGrid} aria-label="Shares">
        {rows.map((row) => (
          <PayoutCard key={row.userId ?? "pot"} row={row} start={lit.has(row.userId ?? "pot")} />
        ))}
      </ul>
      <div className={styles.coinLayer} aria-hidden="true" />
    </div>
  );
}
