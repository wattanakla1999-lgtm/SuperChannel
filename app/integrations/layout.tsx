import { redirect } from "next/navigation";
import { AuthenticatedShell } from "@/features/inbox/components/authenticated-shell";
import { getAuthenticatedSession } from "@/server/auth/session";

export default async function IntegrationsLayout({
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
      activeNavigation="integrations"
      sectionLabel="Integrations"
      user={session.user}
    >
      {children}
    </AuthenticatedShell>
  );
}
