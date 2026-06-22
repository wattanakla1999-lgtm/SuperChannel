import type { Metadata } from "next";
import { TeamWorkspace } from "@/features/team/components/team-workspace";

export const metadata: Metadata = {
  title: "Team | SuperChannel",
  description: "Mock team management workspace for SuperChannel.",
};

export default function TeamPage() {
  return <TeamWorkspace />;
}
