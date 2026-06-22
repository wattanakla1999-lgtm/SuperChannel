import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPage } from "@/features/login/components/login-page";
import { getMockSession } from "@/server/auth/mock-session";

export const metadata: Metadata = {
  title: "Login | SuperChannel",
  description: "Access the SuperChannel workspace with the mock admin account.",
};

export default async function LoginRoute() {
  const session = await getMockSession();

  if (session) {
    redirect("/inbox");
  }

  return <LoginPage />;
}
