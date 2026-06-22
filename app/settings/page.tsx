import type { Metadata } from "next";
import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";

export const metadata: Metadata = {
  title: "Settings | SuperChannel",
  description: "Workspace settings for SuperChannel.",
};

export default function SettingsPage() {
  return <SettingsWorkspace />;
}
