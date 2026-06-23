import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { getAuthenticatedSession } from "@/server/auth/session";
import { ChannelType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";

    const identities = await prisma.customerChannelIdentity.findMany({
      where: {
        organizationId: session.organizationId,
        channel: ChannelType.LINE,
        ...(search
          ? {
              OR: [
                { handle: { contains: search, mode: "insensitive" } },
                { externalId: { contains: search, mode: "insensitive" } },
                { customer: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        customer: {
          select: { name: true, avatarFallback: true },
        },
      },
      take: 30,
      orderBy: { customer: { name: "asc" } },
    });

    return NextResponse.json(
      identities.map((i) => ({
        lineUserId: i.externalId,
        customerName: i.customer.name,
        handle: i.handle,
      }))
    );
  } catch (error) {
    console.error("[LINE_CUSTOMERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
