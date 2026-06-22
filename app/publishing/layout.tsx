import { redirect } from "next/navigation";
import { AuthenticatedShell } from "@/features/inbox/components/authenticated-shell";
import { getAuthenticatedSession } from "@/server/auth/session";

export default async function PublishingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthenticatedSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AuthenticatedShell
      activeNavigation="publishing"
      sectionLabel="Publishing"
      user={session.user}
    >
      {children}
    </AuthenticatedShell>
  );
}
