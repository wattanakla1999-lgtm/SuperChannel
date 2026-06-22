export type InboxChannel = "LINE" | "Facebook" | "Instagram" | "Telegram";

export type ConversationStatus =
  | "open"
  | "pending"
  | "resolved"
  | "unread"
  | "all";

export type ThreadStatus = Exclude<ConversationStatus, "all" | "unread">;

export type MessageType = "text" | "image";

export type Customer = {
  id: string;
  avatarFallback: string;
  email: string;
  location: string;
  name: string;
  notes: string;
  phone: string;
};

export type ConversationSummary = {
  assignedAgent: string;
  channel: InboxChannel;
  customerAvatarFallback: string;
  customerId: string;
  customerName: string;
  id: string;
  lastMessageAt: string;
  preview: string;
  status: ThreadStatus;
  tags: string[];
  unreadCount: number;
};

export type ConversationMessage = {
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
export const DEFAULT_PANEL_WIDTHS = { left: 360, right: 320 };
export const LEFT_PANEL_MIN = 280;
export const LEFT_PANEL_MAX = 480;
export const RIGHT_PANEL_MIN = 260;
export const RIGHT_PANEL_MAX = 420;
export const CENTER_PANEL_MIN = 280;
export const DIVIDER_WIDTH = 12;

export type PanelSide = "left" | "right";
export type PanelWidths = typeof DEFAULT_PANEL_WIDTHS;

