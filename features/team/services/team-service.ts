import { apiClient } from "@/lib/http/api-client";
import type {
  TeamInvitation,
  TeamInvitationInput,
  TeamListResponse,
  TeamMember,
  TeamMemberUpdateInput,
  TeamQuery,
} from "../types/team";

function toQueryString(query: TeamQuery) {
  const params = new URLSearchParams();

  if (query.search) {
    params.set("search", query.search);
  }

  if (query.role && query.role !== "all") {
    params.set("role", query.role);
  }

  if (query.team && query.team !== "all") {
    params.set("team", query.team);
  }

  if (query.onlineStatus && query.onlineStatus !== "all") {
    params.set("onlineStatus", query.onlineStatus);
  }

  if (query.accountStatus && query.accountStatus !== "all") {
    params.set("accountStatus", query.accountStatus);
  }

  if (query.page) {
    params.set("page", String(query.page));
  }

  if (query.pageSize) {
    params.set("pageSize", String(query.pageSize));
  }

  const search = params.toString();
  return search ? `?${search}` : "";
}

export async function getTeamMembers(query: TeamQuery) {
  const response = await apiClient.get<TeamListResponse>(
    `/api/team/members${toQueryString(query)}`,
  );
  return response.data;
}

export async function inviteTeamMember(input: TeamInvitationInput) {
  const response = await apiClient.post<TeamInvitation>("/api/team/invitations", input);
  return response.data;
}

export async function updateTeamMember(
  memberId: string,
  input: TeamMemberUpdateInput,
) {
  const response = await apiClient.patch<TeamMember>(`/api/team/members/${memberId}`, input);
  return response.data;
}

export async function removeTeamMember(memberId: string) {
  await apiClient.delete(`/api/team/members/${memberId}`);
}
