import { redirect } from "next/navigation";
import { getMockSession } from "@/server/auth/mock-session";

export default async function Home() {
  const session = await getMockSession();

  if (session) {
    redirect("/inbox");
  }

  redirect("/login");
}
