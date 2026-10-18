"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { validateName } from "@/lib/auth-validation";
import { requireUser } from "@/lib/session";

export type ProfileFormState = {
  error?: string;
  fieldError?: string;
  success?: string;
  name?: string;
};

export async function updateName(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  // Actions authorize themselves; the page check doesn't cover them.
  await requireUser("/account/profile");

  const raw = formData.get("name");
  const name = typeof raw === "string" ? raw.trim() : "";
  const fieldError = validateName(name);
  if (fieldError) return { fieldError, name };

  try {
    await auth.api.updateUser({ body: { name }, headers: await headers() });
  } catch (error) {
    console.error("Profile update failed", error);
    return { error: "We couldn't save your changes. Please try again.", name };
  }

  return { success: "Your name has been updated.", name };
}
