import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPage } from "@/features/login/components/login-page";
import { getAuthenticatedSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Login | SuperChannel",
  description: "Access the SuperChannel workspace.",
};

export default async function LoginRoute() {
  const session = await getAuthenticatedSession();

  if (session) {
    redirect("/inbox");
  }

  return <LoginPage />;
}
