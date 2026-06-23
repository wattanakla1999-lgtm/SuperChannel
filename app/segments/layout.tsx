import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "@/server/auth/session";
import { AuthenticatedShell } from "@/features/inbox/components/authenticated-shell";

export const metadata: Metadata = {
  title: "Segments - SuperChannel",
};

export default async function SegmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthenticatedSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AuthenticatedShell activeNavigation="segments" sectionLabel="Segments" user={session.user}>
      {children}
    </AuthenticatedShell>
  );
}
