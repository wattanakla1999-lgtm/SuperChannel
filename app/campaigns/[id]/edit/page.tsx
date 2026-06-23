import { CampaignBuilder } from "@/features/campaigns/components/campaign-builder";
import { getCampaignById } from "@/features/campaigns/services/campaign-service";
import { getAuthenticatedSession } from "@/server/auth/session";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Edit Campaign | SuperChannel",
};

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const campaign = await getCampaignById(session, id);

  if (!campaign) {
    notFound();
  }

  // Only DRAFT or SCHEDULED campaigns can be edited
  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    redirect(`/campaigns/${id}/view`);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center border-b border-slate-200/80 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          แก้ไขแคมเปญ
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl">
          <CampaignBuilder campaignId={id} />
        </div>
      </main>
    </div>
  );
}
