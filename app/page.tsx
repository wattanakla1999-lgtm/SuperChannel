import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "@/server/auth/session";

export default async function Home() {
  const session = await getAuthenticatedSession();

  if (session) {
    redirect("/inbox");
  }

  redirect("/login");
}
