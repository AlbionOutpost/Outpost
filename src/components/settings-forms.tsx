"use client";
import { useActionState, useState } from "react";
import { saveSettings, deleteAccount } from "@/app/settings/actions";
import { WellSelect } from "./well-select";
import { Field } from "./group-parts";
import styles from "./account.module.css";

export function PreferencesForm({
  initial,
}: {
  initial: { name: string; region: string; characterName: string };
}) {
  const [state, action, pending] = useActionState(saveSettings, { error: "" }),
    [values, setValues] = useState(initial);
  const dirty =
    values.name !== initial.name ||
    values.region !== initial.region ||
    values.characterName !== initial.characterName;
  return (
    <form action={action} className={styles.form}>
      <div className={styles.formGrid}>
        <Field label="Display name" hint="Shown on your public builds, comps and comments.">
          <input
            name="name"
            required
            maxLength={60}
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
          />
        </Field>
        <Field label="Albion region" hint="Prices and tools open on this server.">
          <WellSelect
            name="region"
            value={values.region}
            onChange={(e) => setValues({ ...values, region: e.target.value })}
          >
            <option value="europe">Europe</option>
            <option value="americas">Americas</option>
            <option value="asia">Asia</option>
          </WellSelect>
        </Field>
        <Field
          label="Albion character name"
          wide
          hint="Typed in by you; Outpost does not check it against the game."
        >
          <input
            name="characterName"
            maxLength={40}
            pattern="[a-zA-Z0-9 _-]*"
            value={values.characterName}
            onChange={(e) => setValues({ ...values, characterName: e.target.value })}
          />
        </Field>
      </div>
      {state.error && (
        <p role="alert" className={styles.alert}>
          {state.error}
        </p>
      )}
      <div className={styles.saveBar}>
        <span className={dirty ? "landing-chip" : "landing-chip is-muted"}>
          {dirty ? "Unsaved changes" : "Saved"}
        </span>
        <button
          className="button secondary"
          type="button"
          disabled={pending || !dirty}
          onClick={() => setValues(initial)}
        >
          Reset changes
        </button>
        <button className="button primary" disabled={pending}>
          {pending ? "Saving preferences…" : "Save preferences"}
        </button>
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, { error: "" }),
    [confirmation, setConfirmation] = useState("");
  return (
    <form className={styles.deleteForm} action={action}>
      <Field label="Type DELETE to permanently delete your account">
        <input
          name="confirmation"
          required
          pattern="DELETE"
          autoComplete="off"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </Field>
      <button className={`button secondary ${styles.lossButton}`} disabled={pending}>
        {pending ? "Deleting account…" : "Permanently delete account"}
      </button>
      {state.error && (
        <p role="alert" className={`${styles.alert} ${styles.fullRow}`}>
          {state.error}
        </p>
      )}
    </form>
  );
}
