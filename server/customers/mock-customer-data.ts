import "server-only";

import type {
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
  Customer,
  InboxChannel,
  ThreadStatus,
} from "@/features/inbox/types/inbox";
import type { TeamOption } from "@/features/team/types/team";
import {
  listMockAssignableAgents,
  resolveMockAssignedAgentLabel,
} from "@/server/team/mock-team-data";

type StoredConversation = {
  assignedAgent: string;
  channel: InboxChannel;
  customerId: string;
  id: string;
  messages: ConversationMessage[];
  status: ThreadStatus;
  tags: string[];
  unreadCount: number;
};

type CustomerChannelIdentity = {
  channel: InboxChannel;
  externalId: string;
  handle: string;
};

type CustomerNoteEntry = {
  authorName: string;
  body: string;
  createdAt: string;
  id: string;
};

type CustomerActivityEntry = {
  body: string;
  channel: InboxChannel;
  createdAt: string;
  direction: "inbound" | "outbound" | "internal";
  id: string;
  senderName: string;
  type: "image" | "note" | "text";
};

type StoredCustomer = {
  activityEntries: CustomerActivityEntry[];
  assignedAgent: string;
  connectedChannels: CustomerChannelIdentity[];
  lastInteractionAt: string;
  noteEntries: CustomerNoteEntry[];
  primaryConversationId: string | null;
  profile: Customer;
  status: ThreadStatus;
  tags: string[];
  unreadCount: number;
};

type SessionState = {
  conversations: Map<string, StoredConversation>;
  customers: Map<string, StoredCustomer>;
};

type CustomerListParams = {
  assignedAgent?: string;
  channel?: InboxChannel;
  page: number;
  pageSize: number;
  search?: string;
  status?: ThreadStatus;
  tag?: string;
};

export type MockCustomerSummary = {
  assignedAgent: string;
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
  tags: string[];
  unreadCount: number;
};

export type MockCustomerDetail = MockCustomerSummary & {
  noteEntries: CustomerNoteEntry[];
  notes: string;
  recentActivity: CustomerActivityEntry[];
};

export type MockCustomerListResult = {
  customers: MockCustomerSummary[];
  filters: {
    agents: TeamOption[];
    channels: InboxChannel[];
    statuses: ThreadStatus[];
    tags: string[];
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  totalCustomers: number;
};

export type MockAnalyticsConversationRecord = {
  assignedAgent: string;
  channel: InboxChannel;
  customerId: string;
  customerName: string;
  firstResponseAt: string | null;
  id: string;
  lastActivityAt: string;
  resolvedAt: string | null;
  source: "activity" | "conversation";
  startedAt: string;
  status: ThreadStatus;
};

function createMessage(
  id: string,
  senderName: string,
  body: string,
  createdAt: string,
  direction: "inbound" | "outbound",
  type: "image" | "text" = "text",
): ConversationMessage {
  return {
    body,
    createdAt,
    direction,
    id,
    senderName,
    type,
  };
}

function identity(
  channel: InboxChannel,
  handle: string,
  externalId: string,
): CustomerChannelIdentity {
  return { channel, externalId, handle };
}

function createCustomerRecord(input: {
  activityEntries?: CustomerActivityEntry[];
  assignedAgent: string;
  avatarFallback: string;
  channels: CustomerChannelIdentity[];
  email: string;
  id: string;
  lastInteractionAt: string;
  location: string;
  name: string;
  notes: string;
  phone: string;
  primaryConversationId?: string | null;
  status: ThreadStatus;
  tags: string[];
  unreadCount: number;
}) {
  const createdAt = input.lastInteractionAt;

  return [
    input.id,
    {
      activityEntries:
        input.activityEntries?.map((entry) => ({ ...entry })) ??
        [
          {
            body: input.notes,
            channel: input.channels[0]?.channel ?? "Facebook",
            createdAt,
            direction: "internal",
            id: `activity-${input.id}-1`,
            senderName: input.assignedAgent,
            type: "note",
          },
        ],
      assignedAgent: input.assignedAgent,
      connectedChannels: input.channels.map((channel) => ({ ...channel })),
      lastInteractionAt: input.lastInteractionAt,
      noteEntries: [
        {
          authorName: input.assignedAgent,
          body: input.notes,
          createdAt,
          id: `note-${input.id}-1`,
        },
      ],
      primaryConversationId: input.primaryConversationId ?? null,
      profile: {
        avatarFallback: input.avatarFallback,
        email: input.email,
        id: input.id,
        location: input.location,
        name: input.name,
        notes: input.notes,
        phone: input.phone,
      },
      status: input.status,
      tags: [...input.tags],
      unreadCount: input.unreadCount,
    } satisfies StoredCustomer,
  ] as const;
}

function createInitialConversationStore() {
  return new Map<string, StoredConversation>([
    [
      "conv-line-001",
      {
        assignedAgent: "Mina Ortiz",
        channel: "LINE",
        customerId: "cust-line-nina",
        id: "conv-line-001",
        messages: [
          createMessage(
            "msg-line-1",
            "Nina Tan",
            "Hi team, can you confirm if my order can still ship today?",
            "2026-06-21T08:25:00.000Z",
            "inbound",
          ),
          createMessage(
            "msg-line-2",
            "Mina Ortiz",
            "Yes, it is packed and queued for pickup before 5 PM.",
            "2026-06-21T08:29:00.000Z",
            "outbound",
          ),
          createMessage(
            "msg-line-3",
            "Nina Tan",
            "Perfect, thank you for the quick update.",
            "2026-06-21T08:31:00.000Z",
            "inbound",
          ),
        ],
        status: "open",
        tags: ["VIP", "Shipping"],
        unreadCount: 2,
      },
    ],
    [
      "conv-fb-002",
      {
        assignedAgent: "Jules Carter",
        channel: "Facebook",
        customerId: "cust-fb-marco",
        id: "conv-fb-002",
        messages: [
          createMessage(
            "msg-fb-1",
            "Marco Rivera",
            "Can you share your bulk publishing rates for six brands?",
            "2026-06-21T06:10:00.000Z",
            "inbound",
          ),
          createMessage(
            "msg-fb-2",
            "Jules Carter",
            "Absolutely. I can send the current partner deck and seat tiers.",
            "2026-06-21T06:15:00.000Z",
            "outbound",
          ),
        ],
        status: "pending",
        tags: ["Sales", "Partner"],
        unreadCount: 0,
      },
    ],
    [
      "conv-ig-003",
      {
        assignedAgent: "Priya Das",
        channel: "Instagram",
        customerId: "cust-ig-aya",
        id: "conv-ig-003",
        messages: [
          createMessage(
            "msg-ig-1",
            "Aya Lim",
            "Can you send the latest launch image again?",
            "2026-06-20T15:40:00.000Z",
            "inbound",
          ),
          createMessage(
            "msg-ig-2",
            "Priya Das",
            "Uploaded the launch creative with caption-safe spacing.",
            "2026-06-20T15:45:00.000Z",
            "outbound",
            "image",
          ),
        ],
        status: "resolved",
        tags: ["Creative"],
        unreadCount: 0,
      },
    ],
    [
      "conv-tg-004",
      {
        assignedAgent: "Harper Quinn",
        channel: "Telegram",
        customerId: "cust-tg-jonas",
        id: "conv-tg-004",
        messages: [
          createMessage(
            "msg-tg-1",
            "Jonas Holt",
            "Need an outage summary for the dashboard slowdown.",
            "2026-06-21T02:05:00.000Z",
            "inbound",
          ),
          createMessage(
            "msg-tg-2",
            "Harper Quinn",
            "Sending the incident timeline and mitigation snapshot now.",
            "2026-06-21T02:09:00.000Z",
            "outbound",
          ),
        ],
        status: "open",
        tags: ["Urgent", "Ops"],
        unreadCount: 1,
      },
    ],
  ]);
}

function createInitialCustomerStore() {
  return new Map<string, StoredCustomer>([
    createCustomerRecord({
      assignedAgent: "Mina Ortiz",
      avatarFallback: "NT",
      channels: [identity("LINE", "@ninatan.vip", "line-99124")],
      email: "nina.tan@example.com",
      id: "cust-line-nina",
      lastInteractionAt: "2026-06-21T08:31:00.000Z",
      location: "Bangkok, Thailand",
      name: "Nina Tan",
      notes: "Prefers LINE support and same-day order updates.",
      phone: "+66 81 555 1244",
      primaryConversationId: "conv-line-001",
      status: "open",
      tags: ["VIP", "Shipping"],
      unreadCount: 2,
    }),
    createCustomerRecord({
      assignedAgent: "Jules Carter",
      avatarFallback: "MR",
      channels: [identity("Facebook", "marco.rivera.growth", "fb-22048")],
      email: "marco.rivera@example.com",
      id: "cust-fb-marco",
      lastInteractionAt: "2026-06-21T06:15:00.000Z",
      location: "Manila, Philippines",
      name: "Marco Rivera",
      notes: "Interested in reseller pricing for campaign bundles.",
      phone: "+63 917 800 4512",
      primaryConversationId: "conv-fb-002",
      status: "pending",
      tags: ["Sales", "Partner"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      assignedAgent: "Priya Das",
      avatarFallback: "AL",
      channels: [identity("Instagram", "@ayalim.studio", "ig-48119")],
      email: "aya.lim@example.com",
      id: "cust-ig-aya",
      lastInteractionAt: "2026-06-20T15:45:00.000Z",
      location: "Singapore",
      name: "Aya Lim",
      notes: "Frequently asks for image-ready product details.",
      phone: "+65 9123 8876",
      primaryConversationId: "conv-ig-003",
      status: "resolved",
      tags: ["Creative"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      assignedAgent: "Harper Quinn",
      avatarFallback: "JH",
      channels: [identity("Telegram", "@jonasholt_ops", "tg-70122")],
      email: "jonas.holt@example.com",
      id: "cust-tg-jonas",
      lastInteractionAt: "2026-06-21T02:09:00.000Z",
      location: "Sydney, Australia",
      name: "Jonas Holt",
      notes: "Needs escalation path documented for operations incidents.",
      phone: "+61 412 700 210",
      primaryConversationId: "conv-tg-004",
      status: "open",
      tags: ["Urgent", "Ops"],
      unreadCount: 1,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Asked whether weekend coverage includes comment moderation.",
          channel: "Facebook",
          createdAt: "2026-06-21T07:44:00.000Z",
          direction: "inbound",
          id: "activity-cust-fb-lila-1",
          senderName: "Lila Perez",
          type: "text",
        },
      ],
      assignedAgent: "Mina Ortiz",
      avatarFallback: "LP",
      channels: [identity("Facebook", "lila.perez.shop", "fb-61921")],
      email: "lila.perez@example.com",
      id: "cust-fb-lila",
      lastInteractionAt: "2026-06-21T07:44:00.000Z",
      location: "Jakarta, Indonesia",
      name: "Lila Perez",
      notes: "Waiting on revised quote for weekend moderation support.",
      phone: "+62 811 2200 984",
      status: "open",
      tags: ["Priority", "Wholesale"],
      unreadCount: 3,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Shared mock product launch storyboard revisions.",
          channel: "Instagram",
          createdAt: "2026-06-21T07:10:00.000Z",
          direction: "outbound",
          id: "activity-cust-ig-mateo-1",
          senderName: "Priya Das",
          type: "text",
        },
      ],
      assignedAgent: "Priya Das",
      avatarFallback: "MC",
      channels: [identity("Instagram", "@mateocruz.brand", "ig-88910")],
      email: "mateo.cruz@example.com",
      id: "cust-ig-mateo",
      lastInteractionAt: "2026-06-21T07:10:00.000Z",
      location: "Cebu, Philippines",
      name: "Mateo Cruz",
      notes: "Strong visual direction, prefers approval batches every Tuesday.",
      phone: "+63 945 771 0032",
      status: "pending",
      tags: ["Creative", "Launch"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Requested bilingual support coverage for delivery issues.",
          channel: "LINE",
          createdAt: "2026-06-21T05:55:00.000Z",
          direction: "inbound",
          id: "activity-cust-line-sora-1",
          senderName: "Sora Akiyama",
          type: "text",
        },
      ],
      assignedAgent: "Jules Carter",
      avatarFallback: "SA",
      channels: [identity("LINE", "@sora.home", "line-23098")],
      email: "sora.akiyama@example.com",
      id: "cust-line-sora",
      lastInteractionAt: "2026-06-21T05:55:00.000Z",
      location: "Osaka, Japan",
      name: "Sora Akiyama",
      notes: "Escalate refund questions to local operations within one hour.",
      phone: "+81 80 2222 4401",
      status: "open",
      tags: ["Support", "Bilingual"],
      unreadCount: 1,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Approved the incident recap and requested a PDF export.",
          channel: "Telegram",
          createdAt: "2026-06-21T05:12:00.000Z",
          direction: "outbound",
          id: "activity-cust-tg-emma-1",
          senderName: "Harper Quinn",
          type: "text",
        },
      ],
      assignedAgent: "Harper Quinn",
      avatarFallback: "EL",
      channels: [identity("Telegram", "@emma_liu_ops", "tg-66211")],
      email: "emma.liu@example.com",
      id: "cust-tg-emma",
      lastInteractionAt: "2026-06-21T05:12:00.000Z",
      location: "Hong Kong",
      name: "Emma Liu",
      notes: "Wants incident summaries attached to weekly stakeholder update.",
      phone: "+852 9822 1408",
      status: "resolved",
      tags: ["Ops", "Stakeholder"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Followed up on creator whitelisting permissions.",
          channel: "Facebook",
          createdAt: "2026-06-20T22:30:00.000Z",
          direction: "inbound",
          id: "activity-cust-fb-noah-1",
          senderName: "Noah Garcia",
          type: "text",
        },
      ],
      assignedAgent: "Mina Ortiz",
      avatarFallback: "NG",
      channels: [
        identity("Facebook", "noah.garcia.ads", "fb-33882"),
        identity("Instagram", "@noah.garcia.ads", "ig-33882"),
      ],
      email: "noah.garcia@example.com",
      id: "cust-fb-noah",
      lastInteractionAt: "2026-06-20T22:30:00.000Z",
      location: "Los Angeles, United States",
      name: "Noah Garcia",
      notes: "Requires brand safety signoff before paid media goes live.",
      phone: "+1 213 555 0178",
      status: "pending",
      tags: ["Ads", "Approvals"],
      unreadCount: 2,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Requested a final recap after the weekend flash sale.",
          channel: "LINE",
          createdAt: "2026-06-20T21:15:00.000Z",
          direction: "outbound",
          id: "activity-cust-line-hana-1",
          senderName: "Jules Carter",
          type: "text",
        },
      ],
      assignedAgent: "Jules Carter",
      avatarFallback: "HT",
      channels: [identity("LINE", "@hana_tea_room", "line-55773")],
      email: "hana.tanaka@example.com",
      id: "cust-line-hana",
      lastInteractionAt: "2026-06-20T21:15:00.000Z",
      location: "Kyoto, Japan",
      name: "Hana Tanaka",
      notes: "Send sale recaps before local noon on Mondays.",
      phone: "+81 90 4401 2207",
      status: "resolved",
      tags: ["Retail", "Reporting"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Asked if moderation can cover a six-hour livestream window.",
          channel: "Instagram",
          createdAt: "2026-06-20T20:50:00.000Z",
          direction: "inbound",
          id: "activity-cust-ig-zara-1",
          senderName: "Zara Khan",
          type: "text",
        },
      ],
      assignedAgent: "Priya Das",
      avatarFallback: "ZK",
      channels: [identity("Instagram", "@zarakhan.co", "ig-12093")],
      email: "zara.khan@example.com",
      id: "cust-ig-zara",
      lastInteractionAt: "2026-06-20T20:50:00.000Z",
      location: "Dubai, United Arab Emirates",
      name: "Zara Khan",
      notes: "Discussing livestream moderation and creator support add-ons.",
      phone: "+971 55 330 2114",
      status: "open",
      tags: ["Livestream", "Creator"],
      unreadCount: 4,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Closed the backlog cleanup after route mapping was delivered.",
          channel: "Telegram",
          createdAt: "2026-06-20T19:05:00.000Z",
          direction: "outbound",
          id: "activity-cust-tg-owen-1",
          senderName: "Harper Quinn",
          type: "text",
        },
      ],
      assignedAgent: "Harper Quinn",
      avatarFallback: "OM",
      channels: [identity("Telegram", "@owen_mills", "tg-88210")],
      email: "owen.mills@example.com",
      id: "cust-tg-owen",
      lastInteractionAt: "2026-06-20T19:05:00.000Z",
      location: "Melbourne, Australia",
      name: "Owen Mills",
      notes: "Backlog cleanup complete. Keep weekly checkpoint on Fridays.",
      phone: "+61 423 009 118",
      status: "resolved",
      tags: ["Ops", "Cleanup"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Asked for an updated FAQ card for order cutoff times.",
          channel: "Facebook",
          createdAt: "2026-06-20T18:42:00.000Z",
          direction: "inbound",
          id: "activity-cust-fb-iris-1",
          senderName: "Iris Santos",
          type: "text",
        },
      ],
      assignedAgent: "Mina Ortiz",
      avatarFallback: "IS",
      channels: [identity("Facebook", "iris.santos.store", "fb-91827")],
      email: "iris.santos@example.com",
      id: "cust-fb-iris",
      lastInteractionAt: "2026-06-20T18:42:00.000Z",
      location: "Davao, Philippines",
      name: "Iris Santos",
      notes: "Wants reusable FAQ snippets for seasonal shipping peaks.",
      phone: "+63 917 119 0026",
      status: "pending",
      tags: ["FAQ", "Shipping"],
      unreadCount: 1,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Shared a draft palette update for July campaign cards.",
          channel: "Instagram",
          createdAt: "2026-06-20T17:36:00.000Z",
          direction: "outbound",
          id: "activity-cust-ig-luca-1",
          senderName: "Priya Das",
          type: "image",
        },
      ],
      assignedAgent: "Priya Das",
      avatarFallback: "LR",
      channels: [identity("Instagram", "@luca.rios.design", "ig-77291")],
      email: "luca.rios@example.com",
      id: "cust-ig-luca",
      lastInteractionAt: "2026-06-20T17:36:00.000Z",
      location: "Madrid, Spain",
      name: "Luca Rios",
      notes: "Design feedback lands fastest when grouped by asset family.",
      phone: "+34 612 440 191",
      status: "pending",
      tags: ["Creative", "Feedback"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Requested a morning handoff note for courier escalations.",
          channel: "LINE",
          createdAt: "2026-06-20T16:20:00.000Z",
          direction: "inbound",
          id: "activity-cust-line-kai-1",
          senderName: "Kai Watanabe",
          type: "text",
        },
      ],
      assignedAgent: "Jules Carter",
      avatarFallback: "KW",
      channels: [identity("LINE", "@kai_goods", "line-18841")],
      email: "kai.watanabe@example.com",
      id: "cust-line-kai",
      lastInteractionAt: "2026-06-20T16:20:00.000Z",
      location: "Tokyo, Japan",
      name: "Kai Watanabe",
      notes: "Morning handoff note required for courier and pickup escalations.",
      phone: "+81 80 1934 8208",
      status: "open",
      tags: ["Courier", "Escalation"],
      unreadCount: 2,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Approved the outage update and moved follow-up to next sprint.",
          channel: "Telegram",
          createdAt: "2026-06-20T15:44:00.000Z",
          direction: "outbound",
          id: "activity-cust-tg-mila-1",
          senderName: "Harper Quinn",
          type: "text",
        },
      ],
      assignedAgent: "Harper Quinn",
      avatarFallback: "MP",
      channels: [identity("Telegram", "@mila_park_ops", "tg-88244")],
      email: "mila.park@example.com",
      id: "cust-tg-mila",
      lastInteractionAt: "2026-06-20T15:44:00.000Z",
      location: "Seoul, South Korea",
      name: "Mila Park",
      notes: "Track follow-up fixes in next sprint review instead of live chat.",
      phone: "+82 10 5540 2203",
      status: "resolved",
      tags: ["Sprint", "Ops"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Asked for a mock customer journey summary before approval.",
          channel: "Facebook",
          createdAt: "2026-06-20T14:18:00.000Z",
          direction: "inbound",
          id: "activity-cust-fb-olivia-1",
          senderName: "Olivia Chen",
          type: "text",
        },
      ],
      assignedAgent: "Mina Ortiz",
      avatarFallback: "OC",
      channels: [
        identity("Facebook", "olivia.chen.team", "fb-11029"),
        identity("Telegram", "@oliviachen_team", "tg-11029"),
      ],
      email: "olivia.chen@example.com",
      id: "cust-fb-olivia",
      lastInteractionAt: "2026-06-20T14:18:00.000Z",
      location: "Taipei, Taiwan",
      name: "Olivia Chen",
      notes: "Needs customer journey summary attached before executive approval.",
      phone: "+886 912 110 278",
      status: "pending",
      tags: ["Executive", "Journey"],
      unreadCount: 1,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Requested a revised draft caption for limited-run stock alerts.",
          channel: "Instagram",
          createdAt: "2026-06-20T13:52:00.000Z",
          direction: "inbound",
          id: "activity-cust-ig-rhea-1",
          senderName: "Rhea Patel",
          type: "text",
        },
      ],
      assignedAgent: "Priya Das",
      avatarFallback: "RP",
      channels: [identity("Instagram", "@rheapatel.market", "ig-51233")],
      email: "rhea.patel@example.com",
      id: "cust-ig-rhea",
      lastInteractionAt: "2026-06-20T13:52:00.000Z",
      location: "Mumbai, India",
      name: "Rhea Patel",
      notes: "Prefers stock alert copy with urgency but no discount language.",
      phone: "+91 98765 22014",
      status: "open",
      tags: ["Retail", "Copy"],
      unreadCount: 2,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Closed the courier escalation after proof-of-delivery arrived.",
          channel: "LINE",
          createdAt: "2026-06-20T13:11:00.000Z",
          direction: "outbound",
          id: "activity-cust-line-yuto-1",
          senderName: "Jules Carter",
          type: "text",
        },
      ],
      assignedAgent: "Jules Carter",
      avatarFallback: "YN",
      channels: [identity("LINE", "@yuto_nishi", "line-44102")],
      email: "yuto.nishi@example.com",
      id: "cust-line-yuto",
      lastInteractionAt: "2026-06-20T13:11:00.000Z",
      location: "Nagoya, Japan",
      name: "Yuto Nishimura",
      notes: "Proof-of-delivery issues can be closed once photo evidence lands.",
      phone: "+81 90 7011 2281",
      status: "resolved",
      tags: ["Courier", "Proof"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Asked for a follow-up on audience sentiment from the last post.",
          channel: "Facebook",
          createdAt: "2026-06-20T12:44:00.000Z",
          direction: "inbound",
          id: "activity-cust-fb-diego-1",
          senderName: "Diego Ramos",
          type: "text",
        },
      ],
      assignedAgent: "Mina Ortiz",
      avatarFallback: "DR",
      channels: [identity("Facebook", "diego.ramos.team", "fb-20011")],
      email: "diego.ramos@example.com",
      id: "cust-fb-diego",
      lastInteractionAt: "2026-06-20T12:44:00.000Z",
      location: "Mexico City, Mexico",
      name: "Diego Ramos",
      notes: "Wants sentiment summary within 24 hours after campaign posts.",
      phone: "+52 55 5500 2103",
      status: "open",
      tags: ["Insights", "Campaign"],
      unreadCount: 1,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Shared creator notes for a new three-frame story sequence.",
          channel: "Instagram",
          createdAt: "2026-06-20T11:57:00.000Z",
          direction: "outbound",
          id: "activity-cust-ig-celine-1",
          senderName: "Priya Das",
          type: "text",
        },
      ],
      assignedAgent: "Priya Das",
      avatarFallback: "CL",
      channels: [identity("Instagram", "@celineleung.shop", "ig-76544")],
      email: "celine.leung@example.com",
      id: "cust-ig-celine",
      lastInteractionAt: "2026-06-20T11:57:00.000Z",
      location: "Kuala Lumpur, Malaysia",
      name: "Celine Leung",
      notes: "Creator notes should stay attached to each story sequence.",
      phone: "+60 12 222 7713",
      status: "pending",
      tags: ["Creator", "Stories"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Requested a short handoff summary after the service incident.",
          channel: "Telegram",
          createdAt: "2026-06-20T10:40:00.000Z",
          direction: "inbound",
          id: "activity-cust-tg-ethan-1",
          senderName: "Ethan Cole",
          type: "text",
        },
      ],
      assignedAgent: "Harper Quinn",
      avatarFallback: "EC",
      channels: [identity("Telegram", "@ethancole_ops", "tg-55102")],
      email: "ethan.cole@example.com",
      id: "cust-tg-ethan",
      lastInteractionAt: "2026-06-20T10:40:00.000Z",
      location: "Auckland, New Zealand",
      name: "Ethan Cole",
      notes: "Provide two-sentence handoff summaries after incident resolution.",
      phone: "+64 21 440 812",
      status: "open",
      tags: ["Incident", "Handoff"],
      unreadCount: 2,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Approved final FAQ copy for preorder cutoff reminders.",
          channel: "LINE",
          createdAt: "2026-06-20T09:28:00.000Z",
          direction: "outbound",
          id: "activity-cust-line-mei-1",
          senderName: "Jules Carter",
          type: "text",
        },
      ],
      assignedAgent: "Jules Carter",
      avatarFallback: "ML",
      channels: [identity("LINE", "@mei_lo", "line-84012")],
      email: "mei.lo@example.com",
      id: "cust-line-mei",
      lastInteractionAt: "2026-06-20T09:28:00.000Z",
      location: "Taipei, Taiwan",
      name: "Mei Lo",
      notes: "Preorder FAQ copy is approved. Reuse for future cutoff reminders.",
      phone: "+886 905 220 430",
      status: "resolved",
      tags: ["FAQ", "Preorder"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Asked for bilingual ad variants across two audience segments.",
          channel: "Facebook",
          createdAt: "2026-06-20T08:50:00.000Z",
          direction: "inbound",
          id: "activity-cust-fb-samira-1",
          senderName: "Samira Noor",
          type: "text",
        },
      ],
      assignedAgent: "Mina Ortiz",
      avatarFallback: "SN",
      channels: [
        identity("Facebook", "samira.noor.growth", "fb-33582"),
        identity("Instagram", "@samira.noor.growth", "ig-33582"),
      ],
      email: "samira.noor@example.com",
      id: "cust-fb-samira",
      lastInteractionAt: "2026-06-20T08:50:00.000Z",
      location: "Doha, Qatar",
      name: "Samira Noor",
      notes: "Requests bilingual variants for paid social and organic posts.",
      phone: "+974 5500 1149",
      status: "open",
      tags: ["Bilingual", "Ads"],
      unreadCount: 3,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Sent a revised creator briefing note for the July giveaway.",
          channel: "Instagram",
          createdAt: "2026-06-20T08:12:00.000Z",
          direction: "outbound",
          id: "activity-cust-ig-aria-1",
          senderName: "Priya Das",
          type: "text",
        },
      ],
      assignedAgent: "Priya Das",
      avatarFallback: "AS",
      channels: [identity("Instagram", "@aria_sun.brand", "ig-11288")],
      email: "aria.sun@example.com",
      id: "cust-ig-aria",
      lastInteractionAt: "2026-06-20T08:12:00.000Z",
      location: "Vancouver, Canada",
      name: "Aria Sun",
      notes: "Creator briefing revisions should be grouped by deliverable type.",
      phone: "+1 604 555 0151",
      status: "pending",
      tags: ["Giveaway", "Creator"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Marked the migration checklist complete after vendor approval.",
          channel: "Telegram",
          createdAt: "2026-06-20T07:44:00.000Z",
          direction: "outbound",
          id: "activity-cust-tg-leon-1",
          senderName: "Harper Quinn",
          type: "text",
        },
      ],
      assignedAgent: "Harper Quinn",
      avatarFallback: "LB",
      channels: [identity("Telegram", "@leon_brooks_ops", "tg-44991")],
      email: "leon.brooks@example.com",
      id: "cust-tg-leon",
      lastInteractionAt: "2026-06-20T07:44:00.000Z",
      location: "Brisbane, Australia",
      name: "Leon Brooks",
      notes: "Migration checklist is complete. Archive related follow-up next week.",
      phone: "+61 433 002 919",
      status: "resolved",
      tags: ["Migration", "Vendor"],
      unreadCount: 0,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Requested updated packaging guidance before next courier pickup.",
          channel: "LINE",
          createdAt: "2026-06-20T07:10:00.000Z",
          direction: "inbound",
          id: "activity-cust-line-yara-1",
          senderName: "Yara Haddad",
          type: "text",
        },
      ],
      assignedAgent: "Jules Carter",
      avatarFallback: "YH",
      channels: [identity("LINE", "@yarahaddad.store", "line-93008")],
      email: "yara.haddad@example.com",
      id: "cust-line-yara",
      lastInteractionAt: "2026-06-20T07:10:00.000Z",
      location: "Amman, Jordan",
      name: "Yara Haddad",
      notes: "Packaging guidance needs a refreshed checklist before courier pickup.",
      phone: "+962 79 440 0182",
      status: "open",
      tags: ["Packaging", "Checklist"],
      unreadCount: 1,
    }),
    createCustomerRecord({
      activityEntries: [
        {
          body: "Asked for one more approval pass on the campaign dashboard wording.",
          channel: "Facebook",
          createdAt: "2026-06-19T22:18:00.000Z",
          direction: "inbound",
          id: "activity-cust-fb-jade-1",
          senderName: "Jade Moreno",
          type: "text",
        },
      ],
      assignedAgent: "Mina Ortiz",
      avatarFallback: "JM",
      channels: [identity("Facebook", "jade.moreno.campaigns", "fb-77451")],
      email: "jade.moreno@example.com",
      id: "cust-fb-jade",
      lastInteractionAt: "2026-06-19T22:18:00.000Z",
      location: "Buenos Aires, Argentina",
      name: "Jade Moreno",
      notes: "Campaign dashboard wording needs one more approval pass.",
      phone: "+54 9 11 4400 8181",
      status: "pending",
      tags: ["Dashboard", "Approvals"],
      unreadCount: 1,
    }),
  ]);
}

const sessionStates = new Map<string, SessionState>();

function getSessionState(sessionId: string) {
  const existing = sessionStates.get(sessionId);

  if (existing) {
    return existing;
  }

  const nextState = {
    conversations: createInitialConversationStore(),
    customers: createInitialCustomerStore(),
  } satisfies SessionState;

  for (const conversationId of nextState.conversations.keys()) {
    syncCustomerFromConversation(nextState, conversationId);
  }

  sessionStates.set(sessionId, nextState);
  return nextState;
}

function getCustomerRecord(state: SessionState, customerId: string) {
  const customer = state.customers.get(customerId);

  if (!customer) {
    throw new Error(`Unknown customer: ${customerId}`);
  }

  return customer;
}

function buildPreview(message: ConversationMessage) {
  return message.type === "image" ? `[Image] ${message.body}` : message.body;
}

function syncCustomerFromConversation(state: SessionState, conversationId: string) {
  const conversation = state.conversations.get(conversationId);

  if (!conversation) {
    return;
  }

  const customer = state.customers.get(conversation.customerId);

  if (!customer) {
    return;
  }

  const latestMessage = conversation.messages.at(-1);

  if (!latestMessage) {
    return;
  }

  customer.assignedAgent = conversation.assignedAgent;
  customer.lastInteractionAt = latestMessage.createdAt;
  customer.primaryConversationId = conversation.id;
  customer.status = conversation.status;
  customer.tags = [...conversation.tags];
  customer.unreadCount = conversation.unreadCount;
}

function toConversationSummary(
  state: SessionState,
  record: StoredConversation,
  sessionId: string,
): ConversationSummary {
  const customer = getCustomerRecord(state, record.customerId);
  const latestMessage = record.messages.at(-1);

  if (!latestMessage) {
    throw new Error(`Conversation ${record.id} has no messages`);
  }

  return {
    assignedAgent: resolveMockAssignedAgentLabel(sessionId, record.assignedAgent),
    channel: record.channel,
    customerAvatarFallback: customer.profile.avatarFallback,
    customerId: customer.profile.id,
    customerName: customer.profile.name,
    id: record.id,
    lastMessageAt: latestMessage.createdAt,
    preview: buildPreview(latestMessage),
    status: record.status,
    tags: [...record.tags],
    unreadCount: record.unreadCount,
  };
}

function toCustomerSummary(
  sessionId: string,
  record: StoredCustomer,
): MockCustomerSummary {
  return {
    assignedAgent: resolveMockAssignedAgentLabel(sessionId, record.assignedAgent),
    avatarFallback: record.profile.avatarFallback,
    connectedChannels: record.connectedChannels.map((channel) => ({ ...channel })),
    email: record.profile.email,
    id: record.profile.id,
    lastInteractionAt: record.lastInteractionAt,
    location: record.profile.location,
    name: record.profile.name,
    phone: record.profile.phone,
    primaryConversationId: record.primaryConversationId,
    status: record.status,
    tags: [...record.tags],
    unreadCount: record.unreadCount,
  };
}

function toCustomerDetail(
  state: SessionState,
  sessionId: string,
  customerId: string,
): MockCustomerDetail | null {
  const record = state.customers.get(customerId);

  if (!record) {
    return null;
  }

  const linkedConversation = record.primaryConversationId
    ? state.conversations.get(record.primaryConversationId) ?? null
    : null;
  const recentActivity = linkedConversation
    ? linkedConversation.messages
        .slice()
        .reverse()
        .map((message) => ({
          body: message.body,
          channel: linkedConversation.channel,
          createdAt: message.createdAt,
          direction: message.direction,
          id: message.id,
          senderName: message.senderName,
          type: message.type,
        }))
    : record.activityEntries
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    ...toCustomerSummary(sessionId, record),
    noteEntries: record.noteEntries
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((entry) => ({ ...entry })),
    notes: record.profile.notes,
    recentActivity,
  };
}

function uniq(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

export async function listMockCustomers(
  sessionId: string,
  params: CustomerListParams,
): Promise<MockCustomerListResult> {
  const state = getSessionState(sessionId);
  const search = params.search?.trim().toLowerCase() ?? "";

  const allCustomers = Array.from(state.customers.values());
  const filteredCustomers = allCustomers
    .filter((customer) => {
      if (params.channel) {
        const matchesChannel = customer.connectedChannels.some(
          (channel) => channel.channel === params.channel,
        );

        if (!matchesChannel) {
          return false;
        }
      }

      if (params.tag && !customer.tags.includes(params.tag)) {
        return false;
      }

      if (params.assignedAgent && customer.assignedAgent !== params.assignedAgent) {
        return false;
      }

      if (params.status && customer.status !== params.status) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        customer.profile.name.toLowerCase().includes(search) ||
        customer.profile.email.toLowerCase().includes(search) ||
        customer.profile.phone.toLowerCase().includes(search)
      );
    })
    .sort((left, right) =>
      right.lastInteractionAt.localeCompare(left.lastInteractionAt),
    );

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / params.pageSize));
  const page = Math.min(Math.max(1, params.page), totalPages);
  const startIndex = (page - 1) * params.pageSize;
  const customers = filteredCustomers
    .slice(startIndex, startIndex + params.pageSize)
    .map((customer) => toCustomerSummary(sessionId, customer));

  return {
    customers,
    filters: {
      agents: listMockAssignableAgents(sessionId),
      channels: uniq(
        allCustomers.flatMap((customer) =>
          customer.connectedChannels.map((channel) => channel.channel),
        ),
      ) as InboxChannel[],
      statuses: uniq(allCustomers.map((customer) => customer.status)) as ThreadStatus[],
      tags: uniq(allCustomers.flatMap((customer) => customer.tags)),
    },
    pagination: {
      page,
      pageSize: params.pageSize,
      totalItems: filteredCustomers.length,
      totalPages,
    },
    totalCustomers: allCustomers.length,
  };
}

export async function getMockCustomerDetail(
  sessionId: string,
  customerId: string,
): Promise<MockCustomerDetail | null> {
  return toCustomerDetail(getSessionState(sessionId), sessionId, customerId);
}

export function canAccessMockInboxCustomer(sessionId: string, customerId: string) {
  const state = getSessionState(sessionId);
  const customer = state.customers.get(customerId);

  return Boolean(customer?.primaryConversationId);
}

export function getMockCustomerProfile(sessionId: string, customerId: string) {
  const state = getSessionState(sessionId);
  const customer = state.customers.get(customerId);

  if (!customer) {
    return null;
  }

  return {
    ...customer.profile,
    assignedAgent: resolveMockAssignedAgentLabel(sessionId, customer.assignedAgent),
    lastInteractionAt: customer.lastInteractionAt,
    primaryConversationId: customer.primaryConversationId,
    status: customer.status,
    tags: [...customer.tags],
    unreadCount: customer.unreadCount,
  };
}

export async function updateMockCustomer(
  sessionId: string,
  customerId: string,
  input: { tags?: string[] },
): Promise<MockCustomerDetail | null> {
  const state = getSessionState(sessionId);
  const record = state.customers.get(customerId);

  if (!record) {
    return null;
  }

  if (input.tags) {
    record.tags = [...input.tags];

    if (record.primaryConversationId) {
      const conversation = state.conversations.get(record.primaryConversationId);

      if (conversation) {
        conversation.tags = [...input.tags];
      }
    }
  }

  return toCustomerDetail(state, sessionId, customerId);
}

export async function addMockCustomerNote(
  sessionId: string,
  customerId: string,
  body: string,
): Promise<MockCustomerDetail | null> {
  const state = getSessionState(sessionId);
  const record = state.customers.get(customerId);

  if (!record) {
    return null;
  }

  const nextNote = {
    authorName: "SuperChannel Admin",
    body,
    createdAt: new Date().toISOString(),
    id: `note-${customerId}-${Date.now()}`,
  } satisfies CustomerNoteEntry;

  record.noteEntries.unshift(nextNote);
  record.profile.notes = body;

  return toCustomerDetail(state, sessionId, customerId);
}

export async function listMockConversations(sessionId: string) {
  const state = getSessionState(sessionId);

  return Array.from(state.conversations.values())
    .map((record) => toConversationSummary(state, record, sessionId))
    .sort((left, right) =>
      right.lastMessageAt.localeCompare(left.lastMessageAt),
    );
}

export async function getMockConversationDetail(
  sessionId: string,
  conversationId: string,
): Promise<ConversationDetail | null> {
  const state = getSessionState(sessionId);
  const record = state.conversations.get(conversationId);

  if (!record) {
    return null;
  }

  return {
    conversation: toConversationSummary(state, record, sessionId),
    customer: { ...getCustomerRecord(state, record.customerId).profile },
    messages: record.messages.map((message) => ({ ...message })),
  };
}

export function getMockAssignmentMetrics(sessionId: string) {
  const state = getSessionState(sessionId);
  const metrics = new Map<
    string,
    { activeConversationCount: number; assignedConversationCount: number }
  >();

  for (const conversation of state.conversations.values()) {
    const current = metrics.get(conversation.assignedAgent) ?? {
      activeConversationCount: 0,
      assignedConversationCount: 0,
    };

    current.assignedConversationCount += 1;

    if (conversation.status === "open" || conversation.status === "pending") {
      current.activeConversationCount += 1;
    }

    metrics.set(conversation.assignedAgent, current);
  }

  return metrics;
}

export function listMockAnalyticsConversationRecords(sessionId: string) {
  const state = getSessionState(sessionId);
  const records: MockAnalyticsConversationRecord[] = [];

  for (const conversation of state.conversations.values()) {
    const customer = getCustomerRecord(state, conversation.customerId);
    const firstInbound = conversation.messages.find(
      (message) => message.direction === "inbound",
    );
    const firstResponse = firstInbound
      ? conversation.messages.find(
          (message) =>
            message.direction === "outbound" &&
            message.createdAt >= firstInbound.createdAt,
        ) ?? null
      : null;
    const latestMessage = conversation.messages.at(-1);

    if (!latestMessage) {
      continue;
    }

    records.push({
      assignedAgent: conversation.assignedAgent,
      channel: conversation.channel,
      customerId: customer.profile.id,
      customerName: customer.profile.name,
      firstResponseAt: firstResponse?.createdAt ?? null,
      id: conversation.id,
      lastActivityAt: latestMessage.createdAt,
      resolvedAt:
        conversation.status === "resolved" ? latestMessage.createdAt : null,
      source: "conversation",
      startedAt: firstInbound?.createdAt ?? conversation.messages[0].createdAt,
      status: conversation.status,
    });
  }

  for (const customer of state.customers.values()) {
    if (customer.primaryConversationId) {
      continue;
    }

    const sortedEntries = customer.activityEntries
      .slice()
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const firstInbound = sortedEntries.find(
      (entry) => entry.direction === "inbound",
    );
    const firstResponse = firstInbound
      ? sortedEntries.find(
          (entry) =>
            entry.direction === "outbound" &&
            entry.createdAt >= firstInbound.createdAt,
        ) ?? null
      : null;
    const startedAt =
      firstInbound?.createdAt ??
      sortedEntries[0]?.createdAt ??
      customer.lastInteractionAt;

    records.push({
      assignedAgent: customer.assignedAgent,
      channel: customer.connectedChannels[0]?.channel ?? "Facebook",
      customerId: customer.profile.id,
      customerName: customer.profile.name,
      firstResponseAt: firstResponse?.createdAt ?? null,
      id: `analytics-${customer.profile.id}`,
      lastActivityAt: customer.lastInteractionAt,
      resolvedAt:
        customer.status === "resolved" ? customer.lastInteractionAt : null,
      source: "activity",
      startedAt,
      status: customer.status,
    });
  }

  return records.sort((left, right) =>
    right.lastActivityAt.localeCompare(left.lastActivityAt),
  );
}

export async function appendMockConversationMessage(
  sessionId: string,
  conversationId: string,
  body: string,
) {
  const state = getSessionState(sessionId);
  const record = state.conversations.get(conversationId);

  if (!record) {
    return null;
  }

  const message: ConversationMessage = {
    body,
    createdAt: new Date().toISOString(),
    direction: "outbound",
    id: `msg-${conversationId}-${Date.now()}`,
    senderName: "SuperChannel Admin",
    type: "text",
  };

  record.messages.push(message);
  record.unreadCount = 0;
  syncCustomerFromConversation(state, conversationId);

  return {
    conversation: toConversationSummary(state, record, sessionId),
    message,
  };
}
