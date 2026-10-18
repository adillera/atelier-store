import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";
import { PageIntro } from "@/components/page-intro";
import { getSession, safeRedirectPath } from "@/lib/session";

import { FormSkeleton } from "../form-skeleton";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false },
};

// The session and ?next= are request data, so they're read inside Suspense
// and the page header stays in the static shell.
export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="flex-1">
      <PageIntro title="Sign In">
        <p className="max-w-md text-ink-muted">
          Welcome back. Sign in to your Atelier account.
        </p>
      </PageIntro>
      <div className="container-prose max-w-md pb-(--section-space)">
        <Suspense fallback={<FormSkeleton fields={2} />}>
          <SignInForm searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function SignInForm({
  searchParams,
}: Pick<PageProps<"/sign-in">, "searchParams">) {
  const [{ next }, session] = await Promise.all([searchParams, getSession()]);
  const nextPath = safeRedirectPath(next);
  if (session) redirect(nextPath);

  return <AuthForm mode="sign-in" next={nextPath} />;
}
