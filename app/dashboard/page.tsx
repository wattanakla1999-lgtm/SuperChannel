import type { Metadata } from "next";
import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";

export const metadata: Metadata = {
  title: "Dashboard | SuperChannel",
  description: "Analytics dashboard for SuperChannel.",
};

export default function DashboardPage() {
  return <DashboardWorkspace />;
}
