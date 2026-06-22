import type { Metadata } from "next";
import { IntegrationsWorkspace } from "@/features/integrations/components/integrations-workspace";

export const metadata: Metadata = {
  title: "Integrations | SuperChannel",
  description: "Mock integration management for SuperChannel.",
};

export default function IntegrationsPage() {
  return <IntegrationsWorkspace />;
}
