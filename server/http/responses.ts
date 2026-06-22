import { NextResponse } from "next/server";

export function unauthorizedResponse() {
  return NextResponse.json(
    {
      code: "UNAUTHORIZED",
      message: "Your session has expired. Please sign in again.",
    },
    { status: 401 },
  );
}

export function forbiddenResponse(message = "You do not have permission to perform this action.") {
  return NextResponse.json(
    {
      code: "FORBIDDEN",
      message,
    },
    { status: 403 },
  );
}

export function invalidRequestResponse(message: string) {
  return NextResponse.json(
    {
      code: "INVALID_REQUEST",
      message,
    },
    { status: 400 },
  );
}
