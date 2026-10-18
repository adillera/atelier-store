import type { Metadata } from "next";
import { Suspense } from "react";

import {
  AccountSection,
  AccountSkeleton,
  DetailList,
  formatMemberSince,
} from "@/components/section";
import { requireUser } from "@/lib/session";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<AccountSkeleton rows={2} />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const user = await requireUser("/account/profile");

  return (
    <div className="stack gap-12">
      <div className="stack gap-2">
        <p className="text-eyebrow">Profile</p>
        <p className="heading-display-sm">Personal Information</p>
      </div>

      <AccountSection title="Your Name">
        <p className="text-sm text-ink-muted">
          The name shown on your account.
        </p>
        <div className="max-w-md">
          <ProfileForm name={user.name} />
        </div>
      </AccountSection>

      <AccountSection title="Sign-in Details">
        <DetailList
          items={[
            {
              label: "Email",
              value: (
                <span className="stack gap-1">
                  <span>{user.email}</span>
                  <span className="text-xs text-ink-muted">
                    Your sign-in email can&apos;t be changed online yet.
                  </span>
                </span>
              ),
            },
            { label: "Member Since", value: formatMemberSince(user.createdAt) },
          ]}
        />
      </AccountSection>
    </div>
  );
}
