"use server";

import { getAuthenticatedSession } from "@/server/auth/session";
import { revalidatePath } from "next/cache";
import { cancelCampaign, deleteCampaign, getCampaigns, resendCampaign } from "../services/campaign-service";

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

export async function resendCampaignAction(campaignId: string) {
  const session = await getAuthenticatedSession();
  if (!session) throw new Error("Unauthorized");

  const { processCampaignId } = await import("../services/campaign-sender.service");

  const newCampaign = await resendCampaign(session, campaignId);
  
  // Process immediately
  const stats = await processCampaignId(newCampaign.id);

  revalidatePath("/campaigns");
  
  return { success: true, newCampaignId: newCampaign.id, ...stats };
}

export async function deleteCampaignAction(campaignId: string) {
  const session = await getAuthenticatedSession();
  if (!session) throw new Error("Unauthorized");

  await deleteCampaign(session, campaignId);
  revalidatePath("/campaigns");

  return { success: true };
}
