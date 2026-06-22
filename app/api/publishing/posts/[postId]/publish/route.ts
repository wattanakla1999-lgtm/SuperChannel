import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import { publishMockPublishingPost } from "@/server/publishing/mock-publishing-data";

type RouteContext = {
  params: Promise<{ postId: string }>;
};

function unauthorizedResponse() {
  return NextResponse.json(
    {
      code: "UNAUTHORIZED",
      message: "Your session has expired. Please sign in again.",
    },
    { status: 401 },
  );
}

export async function POST(_: Request, context: RouteContext) {
  const session = await getMockSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { postId } = await context.params;

  await new Promise((resolve) => setTimeout(resolve, 300));

  const result = await publishMockPublishingPost(session.id, postId);

  if (!result) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Post not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
