import type { Metadata } from "next";
import { PublishingWorkspace } from "@/features/publishing/components/publishing-workspace";

export const metadata: Metadata = {
  title: "Publishing | SuperChannel",
  description: "Mock publishing workflow for SuperChannel.",
};

export default function PublishingPage() {
  return <PublishingWorkspace />;
}
