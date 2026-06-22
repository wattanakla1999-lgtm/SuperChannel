import { redirect } from "next/navigation";
import { AuthenticatedShell } from "@/features/inbox/components/authenticated-shell";
import { getAuthenticatedSession } from "@/server/auth/session";

export default async function InboxLayout({
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
      activeNavigation="inbox"
      sectionLabel="Inbox"
      user={session.user}
    >
      {children}
    </AuthenticatedShell>
  );
}
