import { Metadata } from "next";
import { getAuthenticatedSession } from "@/server/auth/session";
import { getCampaignById } from "@/features/campaigns/services/campaign-service";
import { notFound, redirect } from "next/navigation";
import { CampaignView } from "@/features/campaigns/components/campaign-view";

export const metadata: Metadata = {
  title: "Campaign Details | SuperChannel",
};

export default async function CampaignViewPage({
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

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center border-b border-slate-200/80 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          รายละเอียดแคมเปญ
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl">
          <CampaignView campaign={campaign} />
        </div>
      </main>
    </div>
  );
}
