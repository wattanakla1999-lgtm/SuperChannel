import { redirect } from "next/navigation";
import { AuthenticatedShell } from "@/features/inbox/components/authenticated-shell";
import { getMockSession } from "@/server/auth/mock-session";

export default async function PublishingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getMockSession();

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
