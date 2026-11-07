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

/** The rim: thin discs stacked through the coin's thickness, alternating light and dark. */
const edgeLayers = Array.from({ length: 15 }, (_, i) => (i - 7) / 7);
const dust = Array.from({ length: 10 }, (_, i) => i);
const turns = 4;
const sideAngle = (side: "heads" | "tails") => (side === "tails" ? 180 : 0);
const coinDuration = 2600;
/** When the coin meets the well, as a share of the throw. */
const touch = 0.74;

/**
 * A two-faced silver coin with a real rim (the crown is heads, the skull tails). Give it a
 * `flip` — the side the server landed and a key per throw — and it is tossed in an arc, tumbles
 * end over end with a little precession, catches the light as it turns, lands with a bounce, a
 * ring and a puff of dust, and settles on that side. Its shadow shrinks while it is high.
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
  const stage = useRef<HTMLDivElement>(null);
  const coin = useRef<HTMLDivElement>(null);
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
    const root = stage.current;
    if (!side || !throwKey || !el || !root) return;
    const part = (name: string) => root.querySelector<HTMLElement>(`[data-part="${name}"]`)!;
    const from = resting.current;
    const to = Math.ceil(from / 360) * 360 + turns * 360 + sideAngle(side);
    resting.current = to;
    if (still || prefersReducedMotion()) {
      el.style.transform = `rotateX(${to}deg)`;
      landed.current?.();
      return;
    }
    const D = coinDuration;
    const high = size * 1.05;
    const toward = size * 1.2;
    const timing = { duration: D };
    const animations: Animation[] = [
      // The arc: up and toward the viewer (perspective makes it grow), down, two small bounces.
      part("lift").animate(
        [
          { transform: "translate3d(0,0,0)", easing: "cubic-bezier(.16,.7,.36,1)" },
          {
            transform: `translate3d(0,${-high}px,${toward}px)`,
            offset: 0.38,
            easing: "cubic-bezier(.6,0,.86,.5)",
          },
          { transform: "translate3d(0,0,0)", offset: touch, easing: "cubic-bezier(.2,.7,.4,1)" },
          {
            transform: `translate3d(0,${-size * 0.16}px,${size * 0.05}px)`,
            offset: 0.84,
            easing: "cubic-bezier(.5,0,.8,.5)",
          },
          { transform: "translate3d(0,0,0)", offset: 0.92, easing: "cubic-bezier(.2,.7,.4,1)" },
          { transform: `translate3d(0,${-size * 0.04}px,0)`, offset: 0.96 },
          { transform: "translate3d(0,0,0)" },
        ],
        timing,
      ),
      // End over end, fast and slowing, landing a little short and rocking onto its face.
      el.animate(
        [
          { transform: `rotateX(${from}deg)`, easing: "cubic-bezier(.12,.58,.3,1)" },
          { transform: `rotateX(${to - 28}deg)`, offset: touch, easing: "ease-out" },
          { transform: `rotateX(${to + 14}deg)`, offset: 0.86, easing: "ease-in-out" },
          { transform: `rotateX(${to - 6}deg)`, offset: 0.94, easing: "ease-in-out" },
          { transform: `rotateX(${to}deg)` },
        ],
        { ...timing, fill: "forwards" },
      ),
      // Precession: the spin axis wanders while it flies, then the coin wobbles flat.
      part("tilt").animate(
        [
          { transform: "rotateY(0deg) rotateZ(0deg)" },
          { transform: "rotateY(22deg) rotateZ(-10deg)", offset: 0.2 },
          { transform: "rotateY(-16deg) rotateZ(8deg)", offset: 0.45 },
          { transform: "rotateY(10deg) rotateZ(-4deg)", offset: 0.65 },
          { transform: "rotateY(-9deg) rotateZ(3deg)", offset: 0.8 },
          { transform: "rotateY(5deg) rotateZ(-1deg)", offset: 0.9 },
          { transform: "rotateY(0deg) rotateZ(0deg)" },
        ],
        timing,
      ),
      // A soft shadow that shrinks and pales while the coin is high...
      part("shadow").animate(
        [
          { transform: "scale(1)", opacity: 0.85 },
          { transform: "scale(.38)", opacity: 0.3, offset: 0.38 },
          { transform: "scale(1)", opacity: 0.85, offset: touch },
          { transform: "scale(.86)", opacity: 0.7, offset: 0.84 },
          { transform: "scale(1)", opacity: 0.85 },
        ],
        timing,
      ),
      // ...and a sharp contact shadow that is only there on the ground.
      part("contact").animate(
        [
          { opacity: 1 },
          { opacity: 0, offset: 0.1 },
          { opacity: 0, offset: touch - 0.06 },
          { opacity: 1, offset: touch },
          { opacity: 0.4, offset: 0.84 },
          { opacity: 1, offset: 0.92 },
          { opacity: 1 },
        ],
        timing,
      ),
      // The light sweeps across each face every time it turns past.
      ...[...root.querySelectorAll<HTMLElement>("[data-part=sheen]")].map((sheen) =>
        sheen.animate(
          [{ transform: "translate(-70%,-70%)" }, { transform: "translate(70%,70%)" }],
          {
            duration: (D * touch) / turns,
            iterations: turns,
            easing: "cubic-bezier(.4,0,.6,1)",
          },
        ),
      ),
      // Landing: a ring of light on the well and a puff of dust.
      part("ring").animate(
        [
          { transform: "scale(.35)", opacity: 0.9 },
          { transform: "scale(1.9)", opacity: 0 },
        ],
        { duration: 650, delay: D * touch, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
      ),
      ...[...root.querySelectorAll<HTMLElement>("[data-part=dust]")].map((mote, i) => {
        const angle = (i / dust.length) * Math.PI * 2 + 0.3;
        const reach = size * (0.55 + (i % 3) * 0.14);
        return mote.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 0.85 },
            {
              transform: `translate(${Math.cos(angle) * reach}px,${Math.sin(angle) * reach * 0.32 - size * 0.12}px) scale(.3)`,
              opacity: 0,
            },
          ],
          {
            duration: 520 + (i % 4) * 70,
            delay: D * touch,
            easing: "cubic-bezier(.2,.8,.4,1)",
            fill: "forwards",
          },
        );
      }),
    ];
    const spin = animations[1];
    let done = false;
    spin.finished
      .then(() => {
        if (done) return;
        el.style.transform = `rotateX(${to}deg)`;
        spin.cancel();
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
      ref={stage}
      className={styles.coinStage}
      style={{ "--coin": `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <div data-part="shadow" className={styles.coinShadow} />
      <div data-part="contact" className={styles.coinContact} />
      <div data-part="ring" className={styles.coinRing} />
      {dust.map((i) => (
        <span key={i} data-part="dust" className={styles.coinDust} />
      ))}
      <div data-part="lift" className={styles.coinLift}>
        <div data-part="tilt" className={styles.coinTilt}>
          <div ref={coin} className={styles.coin}>
            <div className={styles.coinFace} data-side="heads">
              {/* eslint-disable-next-line @next/next/no-img-element -- painted charge */}
              <img src="/albion/charges/crown.webp" alt="" />
              <span data-part="sheen" className={styles.coinSheen} />
            </div>
            {edgeLayers.map((z, i) => (
              <div
                key={z}
                className={styles.coinEdge}
                data-dark={i % 2 ? "" : undefined}
                style={{ transform: `translateZ(calc(var(--coin) * ${(z * 0.048).toFixed(4)}))` }}
              />
            ))}
            <div className={styles.coinFace} data-side="tails">
              {/* eslint-disable-next-line @next/next/no-img-element -- painted charge */}
              <img src="/albion/charges/skull.webp" alt="" />
              <span data-part="sheen" className={styles.coinSheen} />
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

function PayoutCard({
  row,
  start,
  duration,
}: {
  row: RevealPayout;
  start: boolean;
  duration: number;
}) {
  const shown = useCountUp(start ? row.silver : 0, { duration, from: 0 });
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

/** A small 3D coin for the chest's burst: two faces and a rim, spinning as it flies. */
function flyingCoin() {
  const coin = document.createElement("span");
  coin.className = styles.flyCoin;
  const spin = document.createElement("span");
  spin.className = styles.flyCoinSpin;
  for (const part of ["face", "edge", "edge", "edge", "back"]) {
    const el = document.createElement("i");
    el.dataset.part = part;
    spin.appendChild(el);
  }
  coin.appendChild(spin);
  return { coin, spin };
}

/** Timings for the chest scene, in ms from mount. */
const chestCue = { shake: 380, open: 820, burst: 1080, coin: 1050 };

/**
 * The chest scene. The chest drops in, shakes in anticipation, then its lid swings open on the
 * back hinge, a beam of light rises and silver coins burst out in 3D arcs, spinning, to land
 * in each member's card, which pulses as its share counts up. Plays once on mount.
 */
export function LootChestReveal({ rows, total }: { rows: RevealPayout[]; total: number }) {
  const scene = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [lit, setLit] = useState<Set<string>>(() => new Set());
  const perCard = Math.max(3, Math.min(8, Math.floor(80 / Math.max(rows.length, 1))));
  // A card counts from its first coin to its last.
  const countFor = perCard * 95 + 600;
  const sum = useCountUp(opened ? total : 0, {
    duration: rows.length * 120 + countFor + chestCue.coin - 200,
    from: 0,
  });
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
    const q = (part: string) => root.querySelector<HTMLElement>(`[data-part="${part}"]`)!;
    const timers: number[] = [];
    const animations: Animation[] = [];
    const run = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const a = el.animate(frames, options);
      animations.push(a);
      return a;
    };
    // Drop in, then a nervous shake before the lid gives.
    run(
      q("shake"),
      [
        { transform: "translateY(-40px) scale(.9)" },
        { transform: "translateY(4px) scale(1.02)", offset: 0.55 },
        { transform: "translateY(0) scale(1)" },
      ],
      { duration: chestCue.shake, easing: "cubic-bezier(.2,.8,.3,1.2)" },
    );
    run(
      q("shake"),
      [
        { transform: "rotateZ(0deg) translateX(0)" },
        { transform: "rotateZ(-3deg) translateX(-3px)" },
        { transform: "rotateZ(3deg) translateX(3px)" },
        { transform: "rotateZ(-2.5deg) translateX(-2px) translateY(-3px)" },
        { transform: "rotateZ(2deg) translateX(2px)" },
        { transform: "rotateZ(-1deg) translateY(-6px)" },
        { transform: "rotateZ(0deg) translateY(0)" },
      ],
      { duration: chestCue.open - chestCue.shake, delay: chestCue.shake, easing: "linear" },
    );
    // The lid swings back on its hinge, overshoots and settles.
    run(
      q("lid"),
      [
        { transform: "rotateX(0deg)" },
        { transform: "rotateX(-6deg)", offset: 0.12 },
        { transform: "rotateX(124deg)", offset: 0.62, easing: "ease-in-out" },
        { transform: "rotateX(104deg)", offset: 0.82 },
        { transform: "rotateX(110deg)" },
      ],
      {
        duration: 620,
        delay: chestCue.open,
        easing: "cubic-bezier(.3,.6,.3,1)",
        fill: "backwards",
      },
    );
    timers.push(window.setTimeout(() => setOpened(true), chestCue.open));
    run(
      q("glow"),
      [
        { transform: "scale(0)", opacity: 0 },
        { transform: "scale(1.15)", opacity: 1, offset: 0.4 },
        { transform: "scale(1)", opacity: 0.9 },
      ],
      { duration: 1100, delay: chestCue.open + 60, easing: "ease-out", fill: "backwards" },
    );
    run(
      q("beam"),
      [
        { transform: "scaleY(0) scaleX(.6)", opacity: 0 },
        { transform: "scaleY(1.08) scaleX(1)", opacity: 1, offset: 0.35 },
        { transform: "scaleY(1) scaleX(.95)", opacity: 0.75 },
      ],
      {
        duration: 1300,
        delay: chestCue.open + 80,
        easing: "cubic-bezier(.16,1,.3,1)",
        fill: "backwards",
      },
    );
    const mouth = q("mouth");
    const layer = q("coins");
    timers.push(
      window.setTimeout(() => {
        const origin = mouth.getBoundingClientRect();
        const base = layer.getBoundingClientRect();
        const ox = origin.left + origin.width / 2 - base.left;
        const oy = origin.top + origin.height / 2 - base.top;
        let lastLand = 0;
        rows.forEach((row, cardIndex) => {
          const id = row.userId ?? "pot";
          const card = root.querySelector<HTMLElement>(`[data-userid="${CSS.escape(id)}"]`);
          const icon = card?.querySelector<HTMLElement>(`.${styles.payoutSilver} img`);
          if (!card || !icon) return;
          const target = icon.getBoundingClientRect();
          const tx = target.left + target.width / 2 - base.left;
          const ty = target.top + target.height / 2 - base.top;
          for (let c = 0; c < perCard; c++) {
            const { coin, spin } = flyingCoin();
            layer.appendChild(coin);
            // Deterministic variety: each coin its own burst height, side, depth and pace.
            const seed = (cardIndex * 7 + c * 13) % 17;
            const burstX = ox + (seed - 8) * 9;
            const burstY = oy - 110 - (seed % 6) * 22;
            const depth = 90 + (seed % 5) * 45;
            const delay = cardIndex * 120 + c * 95 + (seed % 3) * 25;
            const duration = 980 + (seed % 4) * 90;
            lastLand = Math.max(lastLand, delay + duration);
            run(
              coin,
              [
                { transform: `translate3d(${ox}px,${oy}px,0) scale(.4)`, opacity: 0 },
                {
                  transform: `translate3d(${ox}px,${oy - 20}px,20px) scale(.7)`,
                  opacity: 1,
                  offset: 0.08,
                },
                {
                  transform: `translate3d(${burstX}px,${burstY}px,${depth}px) scale(1.15)`,
                  offset: 0.42,
                  easing: "cubic-bezier(.45,0,.7,.6)",
                },
                {
                  transform: `translate3d(${(burstX + tx) / 2}px,${Math.min(burstY, ty) - 30}px,${depth / 2}px) scale(.95)`,
                  offset: 0.7,
                },
                { transform: `translate3d(${tx}px,${ty}px,0) scale(.7)`, opacity: 1, offset: 0.94 },
                { transform: `translate3d(${tx}px,${ty}px,0) scale(.25)`, opacity: 0 },
              ],
              { duration, delay, easing: "cubic-bezier(.25,.6,.4,1)", fill: "both" },
            )
              .finished.then(() => {
                coin.remove();
                if (c === 0) setLit((prev) => new Set(prev).add(id));
                // The card takes each coin with a pulse.
                run(
                  card,
                  [
                    { transform: "scale(1.022)" },
                    { transform: "scale(1.06)", offset: 0.35 },
                    { transform: "scale(1.022)" },
                  ],
                  { duration: 240, easing: "ease-out" },
                );
              })
              .catch(() => coin.remove());
            run(
              spin,
              [
                { transform: "rotateX(0deg) rotateY(0deg)" },
                {
                  transform: `rotateX(${(seed % 2 ? 1 : -1) * (540 + seed * 30)}deg) rotateY(${160 + seed * 20}deg)`,
                },
              ],
              { duration, delay, easing: "cubic-bezier(.2,.5,.5,1)", fill: "both" },
            );
          }
        });
        // A final settle once the last coin is home: the lid eases and the light steadies.
        timers.push(
          window.setTimeout(() => {
            run(
              q("lid"),
              [
                { transform: "rotateX(110deg)" },
                { transform: "rotateX(100deg)", offset: 0.5 },
                { transform: "rotateX(108deg)" },
              ],
              { duration: 520, easing: "ease-in-out" },
            );
            run(
              q("shake"),
              [
                { transform: "translateY(0) scale(1)" },
                { transform: "translateY(3px) scale(1.015,.985)", offset: 0.4 },
                { transform: "translateY(0) scale(1)" },
              ],
              { duration: 420, easing: "ease-out" },
            );
            run(
              q("glow"),
              [
                { transform: "scale(1)", opacity: 0.9 },
                { transform: "scale(.7)", opacity: 0.55 },
              ],
              { duration: 900, easing: "ease-out", fill: "forwards" },
            );
          }, lastLand + 80),
        );
      }, chestCue.burst),
    );
    return () => {
      timers.forEach((t) => clearTimeout(t));
      animations.forEach((a) => a.cancel());
      layer.replaceChildren();
    };
  }, [rows, perCard]);
  return (
    <div ref={scene} className={styles.revealScene}>
      <div className={styles.chestStage} aria-hidden="true">
        <div data-part="glow" className={styles.chestGlow} data-open={opened ? "" : undefined} />
        <div data-part="beam" className={styles.chestBeam} data-open={opened ? "" : undefined} />
        <div data-part="shake" className={styles.chestShake}>
          <div className={styles.chest} data-open={opened ? "" : undefined}>
            <div className={styles.chestBody}>
              <span data-face="front" />
              <span data-face="back" />
              <span data-face="left" />
              <span data-face="right" />
              <span data-face="bottom" />
              <span data-face="inside" data-part="mouth" />
            </div>
            <div data-part="lid" className={styles.chestLid}>
              <span data-face="front" />
              <span data-face="back" />
              <span data-face="left" />
              <span data-face="right" />
              <span data-face="top" />
              <span data-face="under" />
            </div>
          </div>
        </div>
        <div className={styles.chestShadow} />
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
          <PayoutCard
            key={row.userId ?? "pot"}
            row={row}
            start={lit.has(row.userId ?? "pot")}
            duration={countFor}
          />
        ))}
      </ul>
      <div data-part="coins" className={styles.coinLayer} aria-hidden="true" />
    </div>
  );
}
