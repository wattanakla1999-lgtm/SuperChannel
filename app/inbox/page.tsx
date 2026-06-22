import type { Metadata } from "next";
import { InboxWorkspace } from "@/features/inbox/components/inbox-workspace";

export const metadata: Metadata = {
  title: "Inbox | SuperChannel",
  description: "Authenticated inbox for SuperChannel.",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    conversation?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <InboxWorkspace initialConversationId={params.conversation ?? null} />
  );
}
