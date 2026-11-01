"use client";
import { useActionState, useState } from "react";
import { saveSettings, deleteAccount } from "@/app/settings/actions";
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
    <form action={action} className="settings-form">
      <label>
        Display name
        <input
          name="name"
          required
          maxLength={60}
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
        />
      </label>
      <label>
        Albion region
        <select
          name="region"
          value={values.region}
          onChange={(e) => setValues({ ...values, region: e.target.value })}
        >
          <option value="europe">Europe</option>
          <option value="americas">Americas</option>
          <option value="asia">Asia</option>
        </select>
      </label>
      <label>
        Albion character name (manually entered, unverified)
        <input
          name="characterName"
          maxLength={40}
          pattern="[a-zA-Z0-9 _-]*"
          value={values.characterName}
          onChange={(e) => setValues({ ...values, characterName: e.target.value })}
        />
      </label>
      <div className="settings-save-bar">
        <span className="settings-draft-state">
          {dirty ? "Unsaved changes" : "Your current preferences"}
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
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
    </form>
  );
}
export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, { error: "" }),
    [confirmation, setConfirmation] = useState("");
  return (
    <form className="settings-form" action={action}>
      <label>
        Type DELETE to permanently delete your account
        <input
          name="confirmation"
          required
          pattern="DELETE"
          autoComplete="off"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </label>
      <button className="button secondary negative" disabled={pending}>
        {pending ? "Deleting account…" : "Permanently delete account"}
      </button>
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
    </form>
  );
}
