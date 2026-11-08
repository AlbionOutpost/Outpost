"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { AvatarFrame } from "./avatar-frame";
import { prefersReducedMotion, silverText, useCountUp } from "./economy-motion";
import styles from "./team-economy.module.css";

/**
 * The Treasury's 3D moments in CSS: a coin flip, a d100 number drum and a loot chest. They move
 * only transforms and opacity (Web Animations API), play in under two seconds, can be skipped
 * with a click or Esc, and show the result at once under reduced motion. Every one of them only
 * shows a result the server already decided.
 */

/** Runs `skip` on Esc while `active`, before a dialog's own Esc handler sees it. */
function useEscape(active: boolean, skip: () => void) {
  const latest = useRef(skip);
  useLayoutEffect(() => {
    latest.current = skip;
  });
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      latest.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active]);
}

/* ------------------------------------------------------------------------------------------ */
/* Coin                                                                                        */
/* ------------------------------------------------------------------------------------------ */

/** The rim: thin discs stacked through the coin's thickness, reeded round their edge. */
const edgeLayers = Array.from({ length: 13 }, (_, i) => (i - 6) / 6);
const sparks = Array.from({ length: 8 }, (_, i) => i);
const turns = 5;
const sideAngle = (side: "heads" | "tails") => (side === "tails" ? 180 : 0);
/** One throw, in ms. */
export const coinDuration = 1650;
/** When the coin meets the well, as a share of the throw. */
const touch = 0.78;

/**
 * A two-faced silver coin with a reeded rim (the crown is heads, the skull tails). Give it a
 * `flip` — the side the server landed and a key per throw — and it is tossed toward the
 * viewer, spins end over end fast then slower, catches a sweep of light, lands with a small
 * rock onto its face and a ring of light, and settles on that side. A click or Esc skips to
 * the landing; under reduced motion it simply lies on that side.
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
  const playing = useRef<Animation[] | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const landed = useRef(onLanded);
  useLayoutEffect(() => {
    landed.current = onLanded;
  });
  const skip = () => playing.current?.forEach((a) => a.finish());
  useEscape(inFlight, skip);
  // Keyed by the throw, not the object, so a re-render never throws the coin again.
  const side = flip?.side;
  const throwKey = flip?.key;
  useEffect(() => {
    const el = coin.current;
    const root = stage.current;
    if (!side || !throwKey || !el || !root) return;
    const part = (name: string) => root.querySelector<HTMLElement>(`[data-part="${name}"]`)!;
    const all = (name: string) => [...root.querySelectorAll<HTMLElement>(`[data-part="${name}"]`)];
    const from = resting.current;
    const to = Math.ceil(from / 360) * 360 + turns * 360 + sideAngle(side);
    resting.current = to;
    const rest = () => {
      el.style.transform = `rotateX(${to}deg)`;
    };
    if (still || prefersReducedMotion()) {
      rest();
      landed.current?.();
      return;
    }
    const D = coinDuration;
    const high = size * 1.15;
    const timing = { duration: D };
    const hit = D * touch;
    const animations: Animation[] = [
      // Up toward the viewer (perspective makes it grow), down onto the well, one small hop.
      part("lift").animate(
        [
          { transform: "translate3d(0,0,0)", easing: "cubic-bezier(.2,.75,.4,1)" },
          {
            transform: `translate3d(0,${-high}px,${size * 0.6}px)`,
            offset: 0.42,
            easing: "cubic-bezier(.55,0,.85,.4)",
          },
          { transform: "translate3d(0,0,0)", offset: touch, easing: "cubic-bezier(.2,.7,.4,1)" },
          {
            transform: `translate3d(0,${-size * 0.08}px,0)`,
            offset: 0.88,
            easing: "cubic-bezier(.5,0,.8,.5)",
          },
          { transform: "translate3d(0,0,0)" },
        ],
        timing,
      ),
      // End over end, fast and slowing, landing a little short and rocking flat on its face.
      el.animate(
        [
          { transform: `rotateX(${from}deg)`, easing: "cubic-bezier(.18,.6,.32,1)" },
          { transform: `rotateX(${to - 24}deg)`, offset: touch, easing: "ease-out" },
          { transform: `rotateX(${to + 10}deg)`, offset: 0.9, easing: "ease-in-out" },
          { transform: `rotateX(${to}deg)` },
        ],
        { ...timing, fill: "forwards" },
      ),
      // The spin axis wanders a little in the air, then the coin settles square.
      part("tilt").animate(
        [
          { transform: "rotateY(0deg) rotateZ(0deg)" },
          { transform: "rotateY(18deg) rotateZ(-8deg)", offset: 0.25 },
          { transform: "rotateY(-12deg) rotateZ(6deg)", offset: 0.55 },
          { transform: "rotateY(5deg) rotateZ(-2deg)", offset: touch },
          { transform: "rotateY(0deg) rotateZ(0deg)" },
        ],
        timing,
      ),
      // The shadow shrinks and pales while the coin is high.
      part("shadow").animate(
        [
          { transform: "scale(1)", opacity: 0.9 },
          { transform: "scale(.4)", opacity: 0.3, offset: 0.42 },
          { transform: "scale(1)", opacity: 0.9, offset: touch },
          { transform: "scale(.9)", opacity: 0.75, offset: 0.88 },
          { transform: "scale(1)", opacity: 0.9 },
        ],
        timing,
      ),
      // Light catches each face as it turns in the air, then one slow glint once it rests.
      ...all("sheen").flatMap((sheen) => [
        sheen.animate([{ transform: "translateX(-120%)" }, { transform: "translateX(120%)" }], {
          duration: hit / 3,
          iterations: 3,
          easing: "cubic-bezier(.4,0,.6,1)",
        }),
        sheen.animate([{ transform: "translateX(-120%)" }, { transform: "translateX(120%)" }], {
          duration: 620,
          delay: D * 0.9,
          easing: "cubic-bezier(.3,0,.3,1)",
        }),
      ]),
      // Landing: a ring of light on the well and a few sparks.
      part("ring").animate(
        [
          { transform: "scale(.4)", opacity: 0.9 },
          { transform: "scale(1.8)", opacity: 0 },
        ],
        { duration: 560, delay: hit, easing: "cubic-bezier(.16,1,.3,1)" },
      ),
      ...all("spark").map((spark, i) => {
        const angle = (i / sparks.length) * Math.PI * 2 + 0.4;
        const reach = size * (0.55 + (i % 2) * 0.18);
        return spark.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            {
              transform: `translate(${Math.cos(angle) * reach}px,${Math.sin(angle) * reach * 0.3 - size * 0.1}px) scale(.2)`,
              opacity: 0,
            },
          ],
          { duration: 480, delay: hit, easing: "cubic-bezier(.2,.8,.4,1)" },
        );
      }),
    ];
    const spin = animations[1];
    playing.current = animations;
    const id = requestAnimationFrame(() => setInFlight(true));
    let cancelled = false;
    spin.finished
      .then(() => {
        if (cancelled) return;
        rest();
        spin.cancel();
        playing.current = null;
        setInFlight(false);
        landed.current?.();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      playing.current = null;
      animations.forEach((a) => a.cancel());
      rest();
    };
  }, [side, throwKey, size, still]);
  return (
    <div
      ref={stage}
      className={styles.coinStage}
      style={{ "--coin": `${size}px` } as CSSProperties}
      data-flying={inFlight ? "" : undefined}
      aria-hidden="true"
      onClick={skip}
    >
      <div data-part="shadow" className={styles.coinShadow} />
      <div data-part="ring" className={styles.coinRing} />
      {sparks.map((i) => (
        <span key={i} data-part="spark" className={styles.coinSpark} />
      ))}
      <div data-part="lift" className={styles.coinLift}>
        <div className={styles.coinView}>
          <div data-part="tilt" className={styles.coinTilt}>
            <div ref={coin} className={styles.coin}>
              <div className={styles.coinFace} data-side="heads">
                {/* eslint-disable-next-line @next/next/no-img-element -- painted charge */}
                <img src="/albion/charges/crown.webp" alt="" />
                <span data-part="sheen" className={styles.coinSheen} />
              </div>
              {edgeLayers.map((z) => (
                <div
                  key={z}
                  className={styles.coinEdge}
                  style={{ transform: `translateZ(calc(var(--coin) * ${(z * 0.05).toFixed(4)}))` }}
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

/** The reveal's beats, in ms from mount: it lands, strains, opens, and the shares come in. */
const chestCue = { strain: 300, open: 640, burst: 700, result: 1000, done: 1900 };
const burstCoins = Array.from({ length: 12 }, (_, i) => i);
type Phase = "closed" | "open" | "result" | "done";

function PayoutCard({
  row,
  index,
  start,
  instant,
}: {
  row: RevealPayout;
  index: number;
  start: boolean;
  instant: boolean;
}) {
  const shown = useCountUp(start ? row.silver : 0, { duration: instant ? 0 : 760, from: 0 });
  return (
    <li
      className={styles.payoutCard}
      data-userid={row.userId ?? "pot"}
      style={{ "--i": index } as CSSProperties}
    >
      {row.userId ? (
        <AvatarFrame frame={row.frame} size={44} name={row.name} />
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
 * The loot chest reveal, about two seconds: the chest drops onto the well, strains while light
 * leaks from its seam, the lid swings back on its hinge with a flash and a handful of coins,
 * then the total and each member's share count in. Skip, a click or Esc jumps to the result;
 * reduced motion shows it at once. Plays once on mount; the figures are the server's.
 */
export function LootChestReveal({ rows, total }: { rows: RevealPayout[]; total: number }) {
  const scene = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  const [instant, setInstant] = useState(false);
  const skipper = useRef<() => void>(() => {});
  const playing = phase !== "done";
  useEscape(playing && !instant, () => skipper.current());
  useEffect(() => {
    const root = scene.current;
    if (!root) return;
    const finishNow = () => {
      setInstant(true);
      setPhase("done");
    };
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(finishNow);
      return () => cancelAnimationFrame(id);
    }
    const q = (part: string) => root.querySelector<HTMLElement>(`[data-part="${part}"]`)!;
    const animations: Animation[] = [];
    const run = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      animations.push(el.animate(frames, options));
    };
    // It drops onto the well and squashes a touch.
    run(
      q("drop"),
      [
        { transform: "translateY(-48px) scale(.92)", opacity: 0 },
        { transform: "translateY(0) scale(1.03,.96)", opacity: 1, offset: 0.7 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ],
      { duration: chestCue.strain, easing: "cubic-bezier(.4,0,.6,1)", fill: "backwards" },
    );
    // It strains: a short rattle while light leaks from under the lid.
    run(
      q("drop"),
      [
        { transform: "rotateZ(0deg)" },
        { transform: "rotateZ(-2deg) translateY(-2px)", offset: 0.25 },
        { transform: "rotateZ(2deg)", offset: 0.5 },
        { transform: "rotateZ(-1deg) translateY(-3px)", offset: 0.75 },
        { transform: "rotateZ(0deg)" },
      ],
      { duration: chestCue.open - chestCue.strain, delay: chestCue.strain },
    );
    run(q("seam"), [{ opacity: 0 }, { opacity: 1 }], {
      duration: chestCue.open - chestCue.strain,
      delay: chestCue.strain,
      easing: "ease-in",
      fill: "backwards",
    });
    // The lid swings back on its hinge past open, then settles.
    run(
      q("lid"),
      [
        { transform: "rotateX(0deg)" },
        { transform: "rotateX(-5deg)", offset: 0.1 },
        { transform: "rotateX(122deg)", offset: 0.55, easing: "cubic-bezier(.3,0,.4,1)" },
        { transform: "rotateX(102deg)", offset: 0.8 },
        { transform: "rotateX(110deg)" },
      ],
      {
        duration: 560,
        delay: chestCue.open,
        easing: "cubic-bezier(.3,.7,.3,1)",
        fill: "backwards",
      },
    );
    // Light: a flash at the mouth, then the glow and slow rays behind it.
    run(
      q("flash"),
      [
        { transform: "scale(.2)", opacity: 0 },
        { transform: "scale(1)", opacity: 1, offset: 0.25 },
        { transform: "scale(1.5)", opacity: 0 },
      ],
      { duration: 520, delay: chestCue.open + 60, easing: "ease-out", fill: "backwards" },
    );
    run(
      q("glow"),
      [
        { transform: "scale(.3)", opacity: 0 },
        { transform: "scale(1.08)", opacity: 1, offset: 0.4 },
        { transform: "scale(1)", opacity: 0.85 },
      ],
      { duration: 900, delay: chestCue.open + 40, easing: "ease-out", fill: "backwards" },
    );
    run(
      q("rays"),
      [
        { transform: "rotate(-12deg) scale(.6)", opacity: 0 },
        { transform: "rotate(4deg) scale(1)", opacity: 0.9, offset: 0.4 },
        { transform: "rotate(18deg) scale(1)", opacity: 0.6 },
      ],
      { duration: 1260, delay: chestCue.open + 80, easing: "ease-out", fill: "backwards" },
    );
    // A handful of coins jump from the mouth, spin and fall away.
    root.querySelectorAll<HTMLElement>(`[data-part="coin"]`).forEach((coin, i) => {
      const side = i % 2 ? 1 : -1;
      const x = side * (24 + ((i * 37) % 120));
      const y = -(90 + ((i * 53) % 90));
      const delay = chestCue.burst + (i % 6) * 40;
      run(
        coin,
        [
          { transform: "translate3d(0,0,0) rotateY(0deg) scale(.5)", opacity: 0 },
          {
            transform: `translate3d(${x * 0.6}px,${y}px,40px) rotateY(${360 * side}deg) scale(1)`,
            opacity: 1,
            offset: 0.45,
            easing: "cubic-bezier(.5,0,.9,.6)",
          },
          {
            transform: `translate3d(${x}px,${y * 0.2 + 40}px,0) rotateY(${720 * side}deg) scale(.8)`,
            opacity: 0,
          },
        ],
        { duration: 820 + (i % 3) * 90, delay, easing: "cubic-bezier(.2,.7,.4,1)", fill: "both" },
      );
    });
    const timers = [
      window.setTimeout(() => setPhase("open"), chestCue.open),
      window.setTimeout(() => setPhase("result"), chestCue.result),
      window.setTimeout(() => setPhase("done"), chestCue.done),
    ];
    skipper.current = () => {
      timers.forEach((t) => clearTimeout(t));
      animations.forEach((a) => a.finish());
      finishNow();
    };
    return () => {
      timers.forEach((t) => clearTimeout(t));
      animations.forEach((a) => a.cancel());
      skipper.current = () => {};
    };
  }, [rows]);
  const opened = phase !== "closed";
  const counting = phase === "result" || phase === "done";
  const sum = useCountUp(counting ? total : 0, { duration: instant ? 0 : 820, from: 0 });
  return (
    <div
      ref={scene}
      className={styles.revealScene}
      data-phase={phase}
      data-instant={instant ? "" : undefined}
      onClick={() => {
        if (playing) skipper.current();
      }}
    >
      <div className={styles.chestStage} aria-hidden="true">
        <div data-part="rays" className={styles.chestRays} />
        <div data-part="glow" className={styles.chestGlow} />
        <div data-part="drop" className={styles.chestDrop}>
          <div className={styles.chest} data-open={opened ? "" : undefined}>
            <div className={styles.chestBody}>
              <span data-face="front" />
              <span data-face="back" />
              <span data-face="left" />
              <span data-face="right" />
              <span data-face="bottom" />
              <span data-face="inside" />
            </div>
            <div data-part="lid" className={styles.chestLid}>
              <span data-face="front" />
              <span data-face="back" />
              <span data-face="left" />
              <span data-face="right" />
              <span data-face="top" />
              <span data-face="under" />
            </div>
            <span data-part="seam" className={styles.chestSeam} />
          </div>
        </div>
        <div data-part="flash" className={styles.chestFlash} />
        <div className={styles.burst}>
          {burstCoins.map((i) => (
            <span key={i} data-part="coin" className={styles.burstCoin} />
          ))}
        </div>
        <div className={styles.chestShadow} />
      </div>
      {playing && !instant && (
        <button
          type="button"
          className={`pill-link is-small ${styles.revealSkip}`}
          onClick={(event) => {
            event.stopPropagation();
            skipper.current();
          }}
        >
          Skip
        </button>
      )}
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
        {rows.map((row, i) => (
          <PayoutCard
            key={row.userId ?? "pot"}
            row={row}
            index={i}
            start={counting}
            instant={instant}
          />
        ))}
      </ul>
    </div>
  );
}
