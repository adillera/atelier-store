"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { signIn, signUp, type AuthFormState } from "@/app/(auth)/actions";
import { TextField, type TextFieldProps } from "@/components/text-field";
import {
  fieldsFor,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateField,
  type AuthField,
  type AuthMode,
} from "@/lib/auth-validation";

// undefined = no client verdict yet (show the server's), null = fixed.
type ClientErrors = Partial<Record<AuthField, string | null>>;

const copy = {
  "sign-in": {
    submit: "Sign In",
    pending: "Signing In…",
    switchPrompt: "New to Atelier?",
    switchLabel: "Create an account",
    switchHref: "/sign-up",
  },
  "sign-up": {
    submit: "Create Account",
    pending: "Creating Account…",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
  },
} as const;

export function AuthForm({ mode, next }: { mode: AuthMode; next?: string }) {
  const isSignUp = mode === "sign-up";
  const text = copy[mode];
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    isSignUp ? signUp : signIn,
    {},
  );
  const [clientErrors, setClientErrors] = useState<ClientErrors>({});
  const [submitCount, setSubmitCount] = useState(0);
  const [passwordLength, setPasswordLength] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // React resets the form after each action, which empties the password
  // field, so the length hint starts over too.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    setPasswordLength(0);
  }

  const errorFor = (field: AuthField) => {
    const client = clientErrors[field];
    return client === undefined ? state.fieldErrors?.[field] : (client ?? undefined);
  };

  const input = (field: AuthField) =>
    formRef.current?.elements.namedItem(field) as HTMLInputElement | null;

  // After the server answers, move focus to the first problem so keyboard
  // and screen reader users land on it.
  useEffect(() => {
    const firstInvalid = fieldsFor(mode).find((field) => state.fieldErrors?.[field]);
    if (firstInvalid) input(firstInvalid)?.focus();
    else if (state.error) input("password")?.focus();
  }, [state, mode]);

  function check(field: AuthField, value: string) {
    setClientErrors((errors) => ({
      ...errors,
      [field]: validateField(mode, field, value) ?? null,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const errors: ClientErrors = {};
    let firstInvalid: AuthField | undefined;
    for (const field of fieldsFor(mode)) {
      const message = validateField(mode, field, String(data.get(field) ?? ""));
      if (message) {
        errors[field] = message;
        firstInvalid ??= field;
      }
    }

    if (firstInvalid) {
      // Stop here; the action never runs and nothing is sent.
      event.preventDefault();
      setClientErrors(errors);
      input(firstInvalid)?.focus();
      return;
    }
    // Valid: clear client verdicts so the server's response shows as-is.
    setClientErrors({});
    setSubmitCount((count) => count + 1);
  }

  const fieldProps = (field: AuthField) => ({
    name: field,
    error: errorFor(field),
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
      // Don't nag about an empty field the user tabbed past.
      if (event.target.value || clientErrors[field] !== undefined) {
        check(field, event.target.value);
      }
    },
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      // Once a field shows an error, re-check as they type so it clears.
      if (errorFor(field)) check(field, event.target.value);
      if (field === "password") setPasswordLength(event.target.value.length);
    },
  });

  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";
  const passwordLongEnough = passwordLength >= PASSWORD_MIN_LENGTH;

  return (
    <div className="stack gap-8">
      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
        aria-busy={pending}
      >
        <fieldset disabled={pending} className="stack gap-6">
          <legend className="sr-only">{text.submit}</legend>
          {next ? <input type="hidden" name="next" value={next} /> : null}

          {state.error ? (
            <p
              // Re-mount per submission so a repeated message is re-announced.
              key={submitCount}
              role="alert"
              className="border border-danger px-4 py-3 text-sm text-danger"
            >
              {state.error}
            </p>
          ) : null}

          {isSignUp ? (
            <TextField
              label="Name"
              autoComplete="name"
              maxLength={NAME_MAX_LENGTH}
              defaultValue={state.values?.name}
              {...fieldProps("name")}
            />
          ) : null}

          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={state.values?.email}
            {...fieldProps("email")}
          />

          <PasswordField
            autoComplete={isSignUp ? "new-password" : "current-password"}
            maxLength={PASSWORD_MAX_LENGTH}
            hint={
              isSignUp ? (
                <span className={passwordLongEnough ? "text-success" : undefined}>
                  {passwordLongEnough ? "✓ " : ""}
                  At least {PASSWORD_MIN_LENGTH} characters
                </span>
              ) : undefined
            }
            {...fieldProps("password")}
          />

          <button type="submit" className="btn btn-primary btn-block mt-2">
            {pending ? text.pending : text.submit}
          </button>
        </fieldset>
      </form>

      <p className="hairline-t pt-6 text-center text-sm text-ink-muted">
        {text.switchPrompt}{" "}
        <Link href={`${text.switchHref}${nextQuery}`} className="link text-ink">
          {text.switchLabel}
        </Link>
      </p>
    </div>
  );
}

function PasswordField(
  props: Omit<TextFieldProps, "label" | "type" | "trailing">,
) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <TextField
      {...props}
      id={id}
      label="Password"
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-controls={id}
          aria-pressed={visible}
          className="text-eyebrow absolute inset-y-0 right-0 px-1 text-ink hover:text-ink-muted"
        >
          {visible ? "Hide" : "Show"}
          <span className="sr-only"> password</span>
        </button>
      }
    />
  );
}
