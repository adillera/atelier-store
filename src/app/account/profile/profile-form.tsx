"use client";

import { useActionState, useState } from "react";

import { TextField } from "@/components/text-field";
import { NAME_MAX_LENGTH, validateName } from "@/lib/auth-validation";

import { updateName, type ProfileFormState } from "../actions";

export function ProfileForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateName,
    {},
  );
  // undefined = no client verdict yet (show the server's), null = valid.
  const [clientError, setClientError] = useState<string | null>();
  const [submitCount, setSubmitCount] = useState(0);
  const [dirty, setDirty] = useState(false);

  // A new server response: show it, and start tracking edits afresh.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setDirty(false);
  }

  const savedName = state.success ? (state.name ?? name) : name;
  const error = clientError === undefined ? state.fieldError : (clientError ?? undefined);
  // Success stays visible until the next edit.
  const success = !dirty ? state.success : undefined;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const value = String(new FormData(event.currentTarget).get("name") ?? "");
    const message = validateName(value);
    if (message) {
      event.preventDefault();
      setClientError(message);
      // Not the first <input>: Server Action forms start with hidden ones.
      event.currentTarget
        .querySelector<HTMLInputElement>('input[name="name"]')
        ?.focus();
      return;
    }
    setClientError(undefined);
    setSubmitCount((count) => count + 1);
  }

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="stack gap-6">
        <legend className="sr-only">Edit your name</legend>

        {state.error ? (
          <p
            key={submitCount}
            role="alert"
            className="border border-danger px-4 py-3 text-sm text-danger"
          >
            {state.error}
          </p>
        ) : null}

        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          maxLength={NAME_MAX_LENGTH}
          // Keep what was typed after an error; show the saved name otherwise.
          defaultValue={state.fieldError || state.error ? state.name : savedName}
          error={error}
          onChange={(event) => {
            setDirty(true);
            if (error) setClientError(validateName(event.target.value) ?? null);
          }}
        />

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-primary">
            {pending ? "Saving…" : "Save Changes"}
          </button>
          <p role="status" className="text-sm text-success">
            {success}
          </p>
        </div>
      </fieldset>
    </form>
  );
}
