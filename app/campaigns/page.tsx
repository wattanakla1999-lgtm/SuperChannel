import { Metadata } from "next";
import { CampaignList } from "@/features/campaigns/components/campaign-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Message Campaigns | SuperChannel",
};

export default async function CampaignsPage() {
  const t = await getTranslations("campaigns");

  return (
    <main
      data-testid="campaigns-page"
      className="flex h-full min-h-[calc(100vh-97px)] flex-col px-4 py-4 lg:px-6 lg:py-6"
    >
      <div className="space-y-4">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                {t("title")}
              </h2>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                {t("subtitle")}
              </p>
            </div>
            <div className="shrink-0">
              <Link href="/campaigns/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("createCampaign")}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="min-h-[24rem] rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CampaignList />
        </section>
      </div>
    </main>
  );
}
