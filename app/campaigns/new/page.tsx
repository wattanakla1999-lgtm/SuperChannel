import { Metadata } from "next";
import { CampaignBuilder } from "@/features/campaigns/components/campaign-builder";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Create Campaign | SuperChannel",
};

export default async function NewCampaignPage() {
  const t = await getTranslations("campaigns");

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center border-b border-slate-200/80 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t("createCampaign")}
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl">
          <CampaignBuilder />
        </div>
      </main>
    </div>
  );
}
