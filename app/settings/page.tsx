import type { Metadata } from "next";
import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";

export const metadata: Metadata = {
  title: "Settings | SuperChannel",
  description: "Mock workspace settings for SuperChannel.",
};

export default function SettingsPage() {
  return <SettingsWorkspace />;
}
