import { redirect } from "next/navigation";
import { AuthenticatedShell } from "@/features/inbox/components/authenticated-shell";
import { getAuthenticatedSession } from "@/server/auth/session";

export default async function CampaignsLayout({
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
      activeNavigation="campaigns"
      sectionLabel="Campaigns"
      user={session.user}
    >
      {children}
    </AuthenticatedShell>
  );
}
