"use server";

import { getAuthenticatedSession } from "@/server/auth/session";
import { getCampaigns, cancelCampaign } from "../services/campaign-service";
import { revalidatePath } from "next/cache";

export async function fetchCampaignsAction(page: number, search: string = "") {
  const session = await getAuthenticatedSession();
  if (!session) throw new Error("Unauthorized");
  return getCampaigns(session, page, 20, search);
}

export async function cancelCampaignAction(campaignId: string) {
  const session = await getAuthenticatedSession();
  if (!session) throw new Error("Unauthorized");
  
  await cancelCampaign(session, campaignId);
  revalidatePath("/campaigns");
  
  return { success: true };
}
