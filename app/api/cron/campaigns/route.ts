import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { processCampaign } from "@/features/campaigns/services/campaign-sender.service";

export const maxDuration = 300; // Allow 5 minutes for cron processing

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "SCHEDULED",
      OR: [
        { scheduledAt: { lte: new Date() } },
        { scheduledAt: null },
      ],
    },
    include: {
      messages: { orderBy: { orderIndex: 'asc' } },
      segment: true,
    },
    take: 5,
  });

  if (campaigns.length === 0) {
    return NextResponse.json({ success: true, message: "No campaigns to process." });
  }

  for (const campaign of campaigns) {
    await processCampaign(campaign);
  }

  return NextResponse.json({ success: true, processed: campaigns.length });
}
