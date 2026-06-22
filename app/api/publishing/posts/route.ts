import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import { createMockPublishingPost, listMockPublishingPosts } from "@/server/publishing/mock-publishing-data";
import type { PublishingCreateInput, PublishingChannel } from "@/features/publishing/types/publishing";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      code: "UNAUTHORIZED",
      message: "Your session has expired. Please sign in again.",
    },
    { status: 401 },
  );
}

export async function GET() {
  const session = await getMockSession();

  if (!session) {
    return unauthorizedResponse();
  }

  await new Promise((resolve) => setTimeout(resolve, 220));

  const posts = await listMockPublishingPosts(session.id);
  return NextResponse.json({ posts });
}

type CreateRequestBody = {
  caption?: unknown;
  channels?: unknown;
  mediaId?: unknown;
  scheduledFor?: unknown;
  submitMode?: unknown;
};

function isChannelList(channels: unknown): channels is PublishingChannel[] {
  return (
    Array.isArray(channels) &&
    channels.every((channel) =>
      ["Facebook", "Instagram", "X", "Telegram", "TikTok"].includes(
        String(channel),
      ),
    )
  );
}

export async function POST(request: Request) {
  const session = await getMockSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as CreateRequestBody | null;

  if (
    !body ||
    typeof body.caption !== "string" ||
    !isChannelList(body.channels) ||
    (body.mediaId !== null && typeof body.mediaId !== "string") ||
    (body.scheduledFor !== null && typeof body.scheduledFor !== "string") ||
    !["draft", "publish", "schedule"].includes(String(body.submitMode))
  ) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Invalid publishing payload" },
      { status: 400 },
    );
  }

  const input: PublishingCreateInput = {
    caption: body.caption.trim(),
    channels: body.channels,
    mediaId: body.mediaId,
    scheduledFor: body.scheduledFor,
    submitMode: body.submitMode as PublishingCreateInput["submitMode"],
  };

  if (!input.caption && !input.mediaId) {
    return NextResponse.json(
      { code: "VALIDATION", message: "Add a caption or media" },
      { status: 422 },
    );
  }

  if (!input.channels.length) {
    return NextResponse.json(
      { code: "VALIDATION", message: "Select at least one channel" },
      { status: 422 },
    );
  }

  if (
    input.submitMode === "schedule" &&
    (!input.scheduledFor ||
      Number.isNaN(Date.parse(input.scheduledFor)) ||
      new Date(input.scheduledFor).getTime() <= Date.now())
  ) {
    return NextResponse.json(
      { code: "VALIDATION", message: "Choose a future date and time" },
      { status: 422 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 400));

  const result = await createMockPublishingPost(session.id, input);
  return NextResponse.json(result, { status: 201 });
}
