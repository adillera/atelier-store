import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";
import { PageIntro } from "@/components/page-intro";
import { getSession, safeRedirectPath } from "@/lib/session";

import { FormSkeleton } from "../form-skeleton";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false },
};

export default function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  return (
    <main className="flex-1">
      <PageIntro title="Create Account">
        <p className="max-w-md text-ink-muted">
          All you need is your name, email and a password.
        </p>
      </PageIntro>
      <div className="container-prose max-w-md pb-(--section-space)">
        <Suspense fallback={<FormSkeleton fields={3} />}>
          <SignUpForm searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function SignUpForm({
  searchParams,
}: Pick<PageProps<"/sign-up">, "searchParams">) {
  const [{ next }, session] = await Promise.all([searchParams, getSession()]);
  const nextPath = safeRedirectPath(next);
  if (session) redirect(nextPath);

  return <AuthForm mode="sign-up" next={nextPath} />;
}
