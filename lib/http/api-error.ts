import axios from "axios";

type ApiErrorOptions = {
  code?: string;
  details?: unknown;
  message: string;
  status?: number;
};

export class ApiError extends Error {
  code?: string;
  details?: unknown;
  status?: number;

  constructor({ code, details, message, status }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export function normalizeApiError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return new ApiError({
      message: "Something went wrong. Please try again.",
    });
  }

  const status = error.response?.status;
  const data = error.response?.data;
  const message =
    typeof data?.message === "string"
      ? data.message
      : typeof data?.error === "string"
        ? data.error
        : status === 401
          ? "Your session has expired. Please sign in again."
          : "Something went wrong. Please try again.";

  return new ApiError({
    code: typeof data?.code === "string" ? data.code : undefined,
    details: data?.details,
    message,
    status,
  });
}
