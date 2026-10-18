"use server";

import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateAuthForm,
  type AuthValues,
  type FieldErrors,
} from "@/lib/auth-validation";
import { safeRedirectPath } from "@/lib/session";

export type AuthFormState = {
  // Form-level message (bad credentials, rate limit, unexpected failure).
  error?: string;
  fieldErrors?: FieldErrors;
  // Echoed back so the form keeps what was typed. Never the password.
  values?: Omit<AuthValues, "password">;
};

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

const RATE_LIMITED = "Too many attempts. Please wait a moment and try again.";
const UNEXPECTED = "Something went wrong on our side. Please try again.";

// Better Auth's rate limiter only runs in its HTTP handler; auth.api.* calls
// skip it. Credential endpoints therefore go through auth.handler, with the
// visitor's IP (x-forwarded-for) and Origin forwarded, so brute-force
// attempts from these forms are limited exactly like /api/auth requests.
// nextCookies() ignores handler calls, so the session cookie is copied onto
// the Server Action response here.
async function postToAuth(
  path: "/sign-in/email" | "/sign-up/email",
  body: Record<string, string>,
) {
  const incoming = await headers();
  const forwarded = new Headers({ "content-type": "application/json" });
  for (const name of ["cookie", "origin", "user-agent", "x-forwarded-for"]) {
    const value = incoming.get(name);
    if (value) forwarded.set(name, value);
  }
  const protocol = incoming.get("x-forwarded-proto") ?? "http";
  const url = new URL(`/api/auth${path}`, `${protocol}://${incoming.get("host")}`);

  const response = await auth.handler(
    new Request(url, { method: "POST", headers: forwarded, body: JSON.stringify(body) }),
  );

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    const store = await cookies();
    parseSetCookieHeader(setCookie).forEach((cookie, name) => {
      if (name) store.set(name, cookie.value, toCookieOptions(cookie));
    });
  }

  if (response.ok) return { ok: true } as const;
  const data: { code?: string } = await response.json().catch(() => ({}));
  return { ok: false, status: response.status, code: data.code } as const;
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = field(formData, "name").trim();
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  const values = { name, email };

  const fieldErrors = validateAuthForm("sign-up", { name, email, password });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  let result;
  try {
    result = await postToAuth("/sign-up/email", { name, email, password });
  } catch (error) {
    console.error("Sign-up failed", error);
    return { error: UNEXPECTED, values };
  }

  if (!result.ok) {
    if (result.status === 429) return { error: RATE_LIMITED, values };

    switch (result.code) {
      // The sign-up API already reports this, so saying so hides nothing.
      case "USER_ALREADY_EXISTS":
      case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
        return {
          fieldErrors: { email: "An account with this email already exists. Sign in instead." },
          values,
        };
      case "INVALID_EMAIL":
        return { fieldErrors: { email: "Enter a valid email address." }, values };
      case "PASSWORD_TOO_SHORT":
        return {
          fieldErrors: { password: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` },
          values,
        };
      case "PASSWORD_TOO_LONG":
        return {
          fieldErrors: { password: `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.` },
          values,
        };
      default:
        console.error("Sign-up rejected", result);
        return { error: UNEXPECTED, values };
    }
  }

  redirect(safeRedirectPath(formData.get("next")));
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  const values = { email };

  const fieldErrors = validateAuthForm("sign-in", { email, password });
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  let result;
  try {
    result = await postToAuth("/sign-in/email", { email, password });
  } catch (error) {
    console.error("Sign-in failed", error);
    return { error: UNEXPECTED, values };
  }

  if (!result.ok) {
    if (result.status === 429) return { error: RATE_LIMITED, values };
    if (result.status >= 500) {
      console.error("Sign-in rejected", result);
      return { error: UNEXPECTED, values };
    }
    // One message for every credential failure, so this form doesn't reveal
    // which emails have accounts.
    return { error: "The email or password is incorrect.", values };
  }

  redirect(safeRedirectPath(formData.get("next")));
}

// No redirect here: with JavaScript, the caller does a full page load
// afterwards (see AccountNav). Without it, the form re-renders the current
// page, whose session check sends the visitor to sign-in.
export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
}
