export type InboxChannel = "LINE" | "Facebook" | "Instagram" | "Telegram";

export type ConversationStatus =
  | "open"
  | "pending"
  | "resolved"
  | "unread"
  | "all";

export type ThreadStatus = Exclude<ConversationStatus, "all" | "unread">;

export type MessageType = "text" | "image" | "sticker" | "audio";

export type Customer = {
  avatarImageUrl?: string | null;
  id: string;
  avatarFallback: string;
  customerTags: { id: string; name: string; color: string | null }[];
  email: string;
  location: string;
  name: string;
  notes: string;
  phone: string;
};

export type ConversationSummary = {
  assignedAgent: string;
  customerAvatarImageUrl?: string | null;
  channel: InboxChannel;
  customerAvatarFallback: string;
  customerId: string;
  customerName: string;
  id: string;
  lastMessageAt: string;
  preview: string;
  status: ThreadStatus;
  tags: { id: string; name: string; color: string | null }[];
  unreadCount: number;
};

export type ConversationMessage = {
  audioDurationMs?: number | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  body: string;
  createdAt: string;
  id: string;
  senderName: string;
  type: MessageType;
  direction: "inbound" | "outbound";
};

export type ConversationDetail = {
  conversation: ConversationSummary;
  customer: Customer;
  messages: ConversationMessage[];
};

export type SendMessageInput = {
  body: string;
};

export type InboxConversationsResponse = {
  conversations: ConversationSummary[];
};

export type InboxConversationResponse = ConversationDetail;

export type SendMessageResponse = {
  conversation: ConversationSummary;
  message: ConversationMessage;
};

export const PANEL_WIDTHS_STORAGE_KEY = "superchannel:inbox-panel-widths";
export const DEFAULT_PANEL_WIDTHS = { left: 320, right: 360 };
export const LEFT_PANEL_MIN = 260;
export const LEFT_PANEL_MAX = 480;
export const RIGHT_PANEL_MIN = 300;
export const RIGHT_PANEL_MAX = 520;
export const CENTER_PANEL_MIN = 420;
export const DIVIDER_WIDTH = 12;

export type PanelSide = "left" | "right";
export type PanelWidths = typeof DEFAULT_PANEL_WIDTHS;
