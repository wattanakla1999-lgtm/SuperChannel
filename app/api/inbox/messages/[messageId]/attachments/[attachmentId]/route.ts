import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { getMessageAttachmentContent } from "@/server/services/customers";

type RouteContext = {
  params: Promise<{
    attachmentId: string;
    messageId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { attachmentId, messageId } = await context.params;

  try {
    const content = await getMessageAttachmentContent(session, messageId, attachmentId);

    if (!content) {
      return new Response("Attachment not found", { status: 404 });
    }

    return new Response(Buffer.from(content.body), {
      headers: {
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": `inline; filename="${content.fileName}"`,
        "Content-Type": content.contentType,
      },
      status: 200,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "NOT_FOUND") {
      return new Response("Attachment not found", { status: 404 });
    }

    if (error instanceof Error && error.name === "FORBIDDEN") {
      return new Response("Unable to load LINE attachment", { status: 502 });
    }

    if (error instanceof Error && error.name === "BAD_GATEWAY") {
      return new Response(error.message, { status: 502 });
    }

    if (error instanceof Error && error.name === "SERVICE_UNAVAILABLE") {
      return new Response(error.message, { status: 503 });
    }

    throw error;
  }
}
