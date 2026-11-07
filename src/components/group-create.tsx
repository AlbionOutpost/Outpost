"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Globe, Lock } from "lucide-react";
import Link from "@/components/link";
import { regions } from "@/lib/albion/region-config";
import {
  crestCharges,
  crestColors,
  defaultCrest,
  slugFromName,
  teamActivities,
  teamSlugPattern,
  type CrestCharge,
  type CrestColor,
} from "@/lib/groups/crest";
import { useOutpostRegion } from "./region-context";
import { Field } from "./group-parts";
import styles from "./group-create.module.css";
import teams from "./teams.module.css";
import { useSwap } from "./team-crest";

const steps = [
  ["Name", "Name your team", "What your guild goes by, and the address members open."],
  ["Banner", "Raise your banner", "A painted shield and the symbol that stands on it."],
  ["Plays", "What you play", "Your server, and up to three things the team runs."],
  ["Gates", "Open the gates", "Who can find the team and ask to join."],
  ["Found", "Found the team", "Check the charter. Everything can change later in Settings."],
] as const;
const title = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
const regionName = (r: string) => regions[r as keyof typeof regions]?.label ?? r;

/** Why an address can't be used yet, by the create API's own rules; empty when it can. */
function slugProblem(slug: string) {
  if (slug.length < 3) return "Use at least 3 characters.";
  if (slug.length > 60) return "Use at most 60 characters.";
  if (!teamSlugPattern.test(slug))
    return "Lowercase letters and numbers, with single hyphens between them.";
  return "";
}

/**
 * The crest as two layers, so a new shield turns in as the old one turns away, and a new symbol
 * strikes onto it as the old one lifts off.
 */
function Crest({ color, charge }: { color: CrestColor; charge: CrestCharge }) {
  const shield = useSwap(color),
    symbol = useSwap(charge);
  return (
    <span className={styles.crest} aria-hidden="true">
      {shield.leaving && (
        <span
          key={`out-${shield.version}`}
          className={styles.shield}
          data-leaving=""
          style={
            { "--shield": `url("/albion/crests/crest-${shield.leaving}.webp")` } as CSSProperties
          }
          onAnimationEnd={shield.done}
        />
      )}
      <span
        key={`in-${shield.version}`}
        className={styles.shield}
        style={
          { "--shield": `url("/albion/crests/crest-${shield.current}.webp")` } as CSSProperties
        }
      />
      {symbol.leaving && (
        <span
          key={`out-${symbol.version}`}
          className={styles.charge}
          data-leaving=""
          style={{ "--charge": `url("/albion/charges/${symbol.leaving}.webp")` } as CSSProperties}
          onAnimationEnd={symbol.done}
        />
      )}
      <span
        key={`in-${symbol.version}`}
        className={styles.charge}
        style={{ "--charge": `url("/albion/charges/${symbol.current}.webp")` } as CSSProperties}
      />
    </span>
  );
}

/**
 * Founding a Team as a short ceremony: name and address, banner, what it plays, who can join,
 * then one review and one submit to `POST /api/groups`. Every answer lives here, so Back and the
 * step list never lose input; the server validates everything again and decides the address.
 */
export function GroupCreate({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const outpostRegion = useOutpostRegion();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<CrestColor>(defaultCrest.color);
  const [charge, setCharge] = useState<CrestCharge>(defaultCrest.charge);
  const [region, setRegion] = useState<string>(outpostRegion);
  const [plays, setPlays] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [recruiting, setRecruiting] = useState(true);
  const [problem, setProblem] = useState<{ step: number; field?: string; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [founded, setFounded] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const reveal = useRef<HTMLElement>(null);
  const address = slugEdited ? slug : slugFromName(name);

  // Each step change moves focus to its heading, so keyboard and screen-reader users follow.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (!founded) return;
    reveal.current?.scrollIntoView({ block: "start" });
    router.prefetch(`/groups/${founded}`);
    const timer = window.setTimeout(() => router.push(`/groups/${founded}`), 2600);
    return () => window.clearTimeout(timer);
  }, [founded, router]);

  const check = (at: number) => {
    if (at === 0 && name.trim().length < 3)
      return { step: 0, field: "name", text: "Give the team a name of at least 3 characters." };
    if (at === 0 && slugProblem(address))
      return { step: 0, field: "slug", text: slugProblem(address) };
    return null;
  };
  const go = (to: number) => {
    // Forward moves pass every step on the way; going back is always free.
    for (let at = step; at < to; at++) {
      const found = check(at);
      if (found) {
        setProblem(found);
        return;
      }
    }
    setProblem(null);
    moved.current = true;
    setStep(to);
    setReached((r) => Math.max(r, to));
  };
  const found = async () => {
    const blocked = check(0);
    if (blocked) {
      setProblem(blocked);
      moved.current = true;
      setStep(0);
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: address,
          description,
          region,
          visibility,
          crestItem: charge,
          crestColor: color,
          activities: plays,
          recruiting,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 409) {
        setProblem({ step: 0, field: "slug", text: "That address is taken. Try another." });
        moved.current = true;
        setStep(0);
        return;
      }
      if (!response.ok) throw new Error(result.error || "Could not found the team");
      setFounded(result.slug);
    } catch (e) {
      setProblem({
        step: 4,
        text: e instanceof Error ? e.message : "Could not found the team",
      });
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (field: string) =>
    problem?.step === step && problem.field === field ? problem.text : undefined;
  const last = step === steps.length - 1;
  const [, stepTitle, stepLine] = steps[step];

  if (founded)
    return (
      <section
        ref={reveal}
        className={styles.reveal}
        aria-labelledby="team-founded"
        data-team-founded=""
      >
        <div className={styles.revealBanner}>
          <span className={styles.rod} aria-hidden="true" />
          <div
            className={styles.cloth}
            style={{ "--shield": `url("/albion/crests/crest-${color}.webp")` } as CSSProperties}
          >
            <span className={styles.revealCrest}>
              <Crest color={color} charge={charge} />
            </span>
          </div>
        </div>
        <div className={styles.revealCopy} role="status">
          <p className={styles.kicker}>Team founded</p>
          <h2 id="team-founded" className={styles.revealTitle}>
            {name.trim()}
          </h2>
          <p className={styles.revealLine}>
            Your banner is up and you hold the Leader seat. Invite your members from Settings.
          </p>
        </div>
        <Link className="button primary" href={`/groups/${founded}`}>
          Enter the workspace <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );

  return (
    <div className={styles.ceremony}>
      <ol className={styles.progress} aria-label="Founding steps">
        {steps.map(([label], i) => (
          <li key={label} data-state={i === step ? "current" : i <= reached ? "done" : "ahead"}>
            <button
              type="button"
              disabled={i > reached || busy}
              aria-current={i === step ? "step" : undefined}
              onClick={() => go(i)}
            >
              <span className={styles.stepBadge} aria-hidden="true">
                {i < reached && i !== step ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className={styles.stepLabel}>
                <span className="sr-only">Step {i + 1}: </span>
                {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* The banner the team will carry, drawn live from every answer */}
      <aside className={styles.stage} aria-label="Banner preview">
        <span className={styles.rod} aria-hidden="true" />
        <div
          className={styles.cloth}
          style={{ "--shield": `url("/albion/crests/crest-${color}.webp")` } as CSSProperties}
        >
          <Crest color={color} charge={charge} />
          <strong className={styles.bannerName} data-empty={name.trim() ? undefined : ""}>
            {name.trim() || "Your team"}
          </strong>
          <span className={styles.bannerLine}>
            {regionName(region)} · {visibility === "PUBLIC" ? "Public" : "Private"}
          </span>
          {plays.length > 0 && (
            <span className={styles.bannerPlays}>
              {plays.map((a) => (
                <span key={a}>{a}</span>
              ))}
            </span>
          )}
        </div>
      </aside>

      <form
        className={`panel ${styles.step}`}
        aria-labelledby="founding-step"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (last) found();
          else go(step + 1);
        }}
      >
        <header className={styles.stepHead}>
          <p className={styles.kicker}>
            Step {step + 1} of {steps.length}
          </p>
          <h2 id="founding-step" ref={heading} tabIndex={-1} className={styles.stepTitle}>
            {stepTitle}
          </h2>
          <p className={styles.stepLine}>{stepLine}</p>
        </header>

        <div className={styles.stepBody} key={step}>
          {step === 0 && (
            <>
              <Field label="Team name" error={fieldError("name")}>
                <input
                  name="name"
                  autoComplete="off"
                  required
                  minLength={3}
                  maxLength={80}
                  value={name}
                  aria-invalid={fieldError("name") ? true : undefined}
                  onChange={(e) => {
                    setName(e.target.value);
                    setProblem(null);
                  }}
                  placeholder="Ironbound Company"
                />
              </Field>
              <Field
                label="Workspace address"
                error={fieldError("slug")}
                hint={
                  !fieldError("slug") &&
                  (slugEdited
                    ? "Lowercase letters, numbers and single hyphens, 3 to 60 characters."
                    : "Filled in from the name until you change it.")
                }
              >
                <span className={teams.prefixed}>
                  <span aria-hidden="true">albionoutpost.com/groups/</span>
                  <input
                    name="slug"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    maxLength={60}
                    value={address}
                    aria-invalid={fieldError("slug") ? true : undefined}
                    onChange={(e) => {
                      setSlugEdited(true);
                      setProblem(null);
                      setSlug(e.target.value.toLowerCase());
                    }}
                    placeholder="ironbound"
                  />
                </span>
              </Field>
              <p className={styles.addressCheck} data-ok={slugProblem(address) ? undefined : ""}>
                {address && !slugProblem(address) ? (
                  <>
                    <Check size={14} strokeWidth={3} aria-hidden="true" /> The address is valid.
                    Outpost confirms it is free when you found the team.
                  </>
                ) : address ? (
                  slugProblem(address)
                ) : (
                  "Type a name and the address follows."
                )}
              </p>
              {slugEdited && (
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => {
                    setSlugEdited(false);
                    setSlug("");
                  }}
                >
                  Use the name&apos;s address again
                </button>
              )}
              <Field
                label="Description (optional)"
                hint="Shown on the team's page; public teams also show it in the directory."
              >
                <textarea
                  name="description"
                  maxLength={4000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Who you are, what you play, when you mass up."
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <fieldset className={styles.group}>
                <legend>Shield</legend>
                <div className={`${teams.swatches} ${styles.shields}`}>
                  {crestColors.map((c) => (
                    <label
                      key={c}
                      className={`${teams.swatch} ${styles.shieldOption}`}
                      style={
                        { "--shield": `url("/albion/crests/crest-${c}.webp")` } as CSSProperties
                      }
                    >
                      <input
                        type="radio"
                        name="crestColor"
                        value={c}
                        checked={color === c}
                        onChange={() => setColor(c)}
                      />
                      <span className="sr-only">{title(c)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.group}>
                <legend>Symbol</legend>
                <div className={`${teams.charges} ${styles.charges}`}>
                  {crestCharges.map((c) => (
                    <label key={c} className={teams.charge} title={title(c)}>
                      <input
                        type="radio"
                        name="crestItem"
                        value={c}
                        checked={charge === c}
                        onChange={() => setCharge(c)}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element -- painted symbol */}
                      <img src={`/albion/charges/${c}.webp`} alt="" width={40} height={40} />
                      <span className="sr-only">{title(c)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {step === 2 && (
            <>
              <fieldset className={styles.group}>
                <legend>Server</legend>
                <div className="segmented">
                  {Object.entries(regions).map(([id, r]) => (
                    <label key={id}>
                      <input
                        type="radio"
                        name="region"
                        value={id}
                        checked={region === id}
                        onChange={() => setRegion(id)}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.group}>
                <legend>
                  What you play <span className={styles.count}>{plays.length} of 3</span>
                </legend>
                <p className={styles.hint}>Players filter the directory by these.</p>
                <div className={teams.playOptions}>
                  {teamActivities.map((a) => {
                    const on = plays.includes(a);
                    return (
                      <label key={a} className={teams.playOption}>
                        <input
                          type="checkbox"
                          name="activities"
                          value={a}
                          checked={on}
                          disabled={!on && plays.length >= 3}
                          onChange={() =>
                            setPlays((list) => (on ? list.filter((x) => x !== a) : [...list, a]))
                          }
                        />
                        {a}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </>
          )}

          {step === 3 && (
            <>
              <fieldset className={styles.group}>
                <legend>Workspace visibility</legend>
                <div className={styles.gates}>
                  {(
                    [
                      [
                        "PRIVATE",
                        "Private",
                        "Invitation links only. Outsiders can't find the team.",
                      ],
                      [
                        "PUBLIC",
                        "Public",
                        "Listed in the Teams directory; players can ask to join.",
                      ],
                    ] as const
                  ).map(([value, label, line]) => (
                    <label key={value} className={styles.gate}>
                      <input
                        type="radio"
                        name="visibility"
                        value={value}
                        checked={visibility === value}
                        aria-labelledby={`gate-${value}`}
                        aria-describedby={`gate-${value}-line`}
                        onChange={() => setVisibility(value)}
                      />
                      {value === "PUBLIC" ? (
                        <Globe size={20} aria-hidden="true" />
                      ) : (
                        <Lock size={20} aria-hidden="true" />
                      )}
                      <span className={styles.gateCopy}>
                        <strong id={`gate-${value}`}>{label}</strong>
                        <small id={`gate-${value}-line`}>{line}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className={styles.hint}>
                Events, comps, builds and loot splits stay members-only either way.
              </p>
              {visibility === "PUBLIC" && (
                <label className={teams.recruitToggle}>
                  <input
                    type="checkbox"
                    name="recruiting"
                    checked={recruiting}
                    onChange={(e) => setRecruiting(e.target.checked)}
                  />
                  <span>
                    <strong>Taking join requests</strong>
                    <small>Turn it off while your roster is full.</small>
                  </span>
                </label>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <dl className={styles.charter}>
                {(
                  [
                    ["Name", name.trim(), 0],
                    ["Address", `albionoutpost.com/groups/${address}`, 0],
                    ["Banner", `${title(charge)} on ${title(color)}`, 1],
                    ["Server", regionName(region), 2],
                    ["Plays", plays.length ? plays.join(", ") : "Not chosen yet", 2],
                    [
                      "Joining",
                      visibility === "PRIVATE"
                        ? "Private · invitation only"
                        : recruiting
                          ? "Public · taking join requests"
                          : "Public · not taking requests",
                      3,
                    ],
                  ] as const
                ).map(([term, value, at]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>
                      <span>{value}</span>
                      <button
                        type="button"
                        className={styles.textButton}
                        aria-label={`Change ${term.toLowerCase()}`}
                        onClick={() => go(at)}
                      >
                        Change
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
              {children}
            </>
          )}
        </div>

        {problem && problem.step === step && !problem.field && (
          <p role="alert" className={teams.alert}>
            {problem.text}
          </p>
        )}
        <div className={styles.actions}>
          {step > 0 && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => go(step - 1)}
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
          )}
          <button className="button primary" disabled={busy}>
            {last ? (busy ? "Founding…" : "Found the team") : `Next: ${steps[step + 1][0]}`}
            {!last && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}
