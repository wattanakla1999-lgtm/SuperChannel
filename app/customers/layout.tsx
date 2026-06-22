import { redirect } from "next/navigation";
import { AuthenticatedShell } from "@/features/inbox/components/authenticated-shell";
import { getMockSession } from "@/server/auth/mock-session";

export default async function CustomersLayout({
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
      activeNavigation="customers"
      sectionLabel="Customers"
      user={session.user}
    >
      {children}
    </AuthenticatedShell>
  );
}
