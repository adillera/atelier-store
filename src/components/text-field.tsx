// Underlined form fields with label, hint and error wired up for assistive
// tech (aria-invalid, aria-describedby). Shared by the auth, account and
// admin forms.

import { useId } from "react";

type FieldChrome = {
  label: string;
  error?: string;
  hint?: React.ReactNode;
};

function useFieldIds(id: string | undefined, error?: string, hint?: React.ReactNode) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;
  return { inputId, hintId, errorId, describedBy };
}

function FieldFrame({
  label,
  error,
  hint,
  ids,
  children,
}: FieldChrome & {
  ids: ReturnType<typeof useFieldIds>;
  children: React.ReactNode;
}) {
  return (
    <div className="stack gap-1">
      <label htmlFor={ids.inputId} className="text-eyebrow">
        {label}
      </label>
      {children}
      {error ? (
        <p id={ids.errorId} className="pt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={ids.hintId} className="pt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const borderFor = (error?: string) => (error ? "border-danger" : "border-line-strong");

export type TextFieldProps = FieldChrome & {
  // Rendered inside the input row, right-aligned (e.g. a Show button).
  trailing?: React.ReactNode;
} & React.ComponentProps<"input">;

export function TextField({
  label,
  error,
  hint,
  trailing,
  id,
  ...props
}: TextFieldProps) {
  const ids = useFieldIds(id, error, hint);
  return (
    <FieldFrame label={label} error={error} hint={hint} ids={ids}>
      <div className="relative">
        <input
          id={ids.inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          className={`h-12 w-full border-b bg-transparent text-base transition-colors placeholder:text-ink-subtle disabled:text-ink-subtle ${borderFor(
            error,
          )} ${trailing ? "pr-16" : ""}`}
          {...props}
        />
        {trailing}
      </div>
    </FieldFrame>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  id,
  ...props
}: FieldChrome & React.ComponentProps<"textarea">) {
  const ids = useFieldIds(id, error, hint);
  return (
    <FieldFrame label={label} error={error} hint={hint} ids={ids}>
      <textarea
        id={ids.inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={`w-full resize-y border bg-transparent p-3 text-sm leading-relaxed transition-colors placeholder:text-ink-subtle disabled:text-ink-subtle ${borderFor(
          error,
        )}`}
        {...props}
      />
    </FieldFrame>
  );
}

export function SelectField({
  label,
  error,
  hint,
  id,
  children,
  ...props
}: FieldChrome & React.ComponentProps<"select">) {
  const ids = useFieldIds(id, error, hint);
  return (
    <FieldFrame label={label} error={error} hint={hint} ids={ids}>
      <select
        id={ids.inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={`h-12 w-full cursor-pointer border-b bg-transparent text-base transition-colors disabled:text-ink-subtle ${borderFor(
          error,
        )}`}
        {...props}
      >
        {children}
      </select>
    </FieldFrame>
  );
}
