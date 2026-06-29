import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { getCustomerAvatarContent } from "@/server/services/customers";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { customerId } = await context.params;
  const avatar = await getCustomerAvatarContent(session, customerId);

  if (!avatar) {
    return new Response("Avatar not found", { status: 404 });
  }

  return new Response(avatar.body, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": avatar.contentType,
    },
    status: 200,
  });
}
