// Sign-in / sign-up validation shared by the form (instant feedback) and the
// Server Actions (the authority). Limits mirror src/lib/auth.ts.

export type AuthMode = "sign-in" | "sign-up";
export type AuthField = "name" | "email" | "password";
export type AuthValues = Partial<Record<AuthField, string>>;
export type FieldErrors = Partial<Record<AuthField, string>>;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 100;

// Deliberately loose: something@something.tld. Better Auth validates again.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Also used by the account profile form.
export function validateName(raw = ""): string | undefined {
  const value = raw.trim();
  if (!value) return "Enter your name.";
  if (value.length > NAME_MAX_LENGTH) {
    return `Name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }
  return undefined;
}

export function validateField(
  mode: AuthMode,
  field: AuthField,
  raw = "",
): string | undefined {
  const value = field === "password" ? raw : raw.trim();

  switch (field) {
    case "name":
      return mode === "sign-in" ? undefined : validateName(value);
    case "email":
      if (!value) return "Enter your email address.";
      if (!EMAIL_PATTERN.test(value)) {
        return "Enter a valid email address, like name@example.com.";
      }
      return undefined;
    case "password":
      if (!value) return "Enter your password.";
      // Length rules only apply when choosing a password.
      if (mode === "sign-in") return undefined;
      if (value.length < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
      }
      if (value.length > PASSWORD_MAX_LENGTH) {
        return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
      }
      return undefined;
  }
}

export function fieldsFor(mode: AuthMode): AuthField[] {
  return mode === "sign-up" ? ["name", "email", "password"] : ["email", "password"];
}

export function validateAuthForm(mode: AuthMode, values: AuthValues) {
  const errors: FieldErrors = {};
  for (const field of fieldsFor(mode)) {
    const message = validateField(mode, field, values[field]);
    if (message) errors[field] = message;
  }
  return errors;
}
