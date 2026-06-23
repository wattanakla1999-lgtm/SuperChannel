import { getAuthenticatedSession } from "@/server/auth/session";
import { invalidRequestResponse, unauthorizedResponse } from "@/server/http/responses";
import { createSignedAttachmentUrl, uploadConversationImage } from "@/server/storage/message-attachments";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return invalidRequestResponse("Please choose an image before uploading.");
  }

  try {
    const uploaded = await uploadConversationImage({
      conversationId: "campaigns-asset", // dynamic logical directory
      file,
      organizationId: session.organizationId,
    });

    const signedUrl = await createSignedAttachmentUrl(uploaded.storagePath, 31536000); // 1 year expiration for campaign asset

    return NextResponse.json({
      success: true,
      url: signedUrl,
      fileName: uploaded.fileName,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
