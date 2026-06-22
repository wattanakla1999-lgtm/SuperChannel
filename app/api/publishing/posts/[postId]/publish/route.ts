import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { publishPublishingPostInDatabase } from "@/server/services/publishing";

type RouteContext = {
  params: Promise<{ postId: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { postId } = await context.params;

  const result = await publishPublishingPostInDatabase(session, postId);

  if (!result) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Post not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
