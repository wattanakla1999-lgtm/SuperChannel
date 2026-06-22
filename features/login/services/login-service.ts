import { apiClient } from "@/lib/http/api-client";
import type { LoginInput, LoginResponse } from "../types/auth";

export async function login(input: LoginInput) {
  const response = await apiClient.post<LoginResponse>("/api/auth/login", input);
  return response.data;
}
