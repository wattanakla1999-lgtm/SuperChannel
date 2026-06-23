import type { InboxChannel, ThreadStatus } from "@/features/inbox/types/inbox";
import type { TeamOption } from "@/features/team/types/team";

export type CustomerChannelIdentity = {
  channel: InboxChannel;
  externalId: string;
  handle: string;
};

export type CustomerSummary = {
  assignedAgent: string;
  avatarImageUrl?: string | null;
  avatarFallback: string;
  connectedChannels: CustomerChannelIdentity[];
  email: string;
  id: string;
  lastInteractionAt: string;
  location: string;
  name: string;
  phone: string;
  primaryConversationId: string | null;
  status: ThreadStatus;
  tags: { id: string; name: string; color: string | null }[];
  unreadCount: number;
};

export type CustomerNoteEntry = {
  authorName: string;
  body: string;
  createdAt: string;
  id: string;
};

export type CustomerActivityEntry = {
  body: string;
  channel: InboxChannel;
  createdAt: string;
  direction: "inbound" | "internal" | "outbound";
  id: string;
  senderName: string;
  type: "image" | "note" | "text";
};

export type CustomerDetail = CustomerSummary & {
  noteEntries: CustomerNoteEntry[];
  notes: string;
  recentActivity: CustomerActivityEntry[];
};

export type CustomerListFilters = {
  agents: TeamOption[];
  channels: InboxChannel[];
  statuses: ThreadStatus[];
  tags: { id: string; name: string; color: string | null }[];
};

export type CustomerListResponse = {
  customers: CustomerSummary[];
  filters: CustomerListFilters;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  totalCustomers: number;
};

export type CustomerQuery = {
  assignedAgent?: string;
  channel?: InboxChannel | "all";
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ThreadStatus | "all";
  tags?: string[];
  tagOperator?: "AND" | "OR";
};

export type UpdateCustomerInput = {
  tags: string[];
};

export type AddCustomerNoteInput = {
  body: string;
};
