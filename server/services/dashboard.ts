import "server-only";

import { prisma } from "@/server/database/prisma";
import type {
  DashboardAgentRow,
  DashboardDistributionSlice,
  DashboardOverview,
  DashboardQuery,
  DashboardTrendPoint,
} from "@/features/dashboard/types/dashboard";
import type { AuthenticatedSession } from "@/server/auth/session";
import { isWorkspaceManager } from "@/server/auth/roles";

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDateRange(query: DashboardQuery) {
  const today = startOfDay(new Date());
  switch (query.dateRange) {
    case "today":
      return { start: today, end: addDays(today, 1) };
    case "last30":
      return { start: addDays(today, -29), end: addDays(today, 1) };
    case "custom":
      return {
        start: query.startDate ? startOfDay(new Date(query.startDate)) : addDays(today, -6),
        end: query.endDate ? addDays(startOfDay(new Date(query.endDate)), 1) : addDays(today, 1),
      };
    case "last7":
    default:
      return { start: addDays(today, -6), end: addDays(today, 1) };
  }
}

function formatRangeLabel(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toChannelLabel(channel: string) {
  if (channel === "FACEBOOK") return "Facebook";
  if (channel === "INSTAGRAM") return "Instagram";
  if (channel === "LINE") return "LINE";
  return "Telegram";
}

function ensureAgentScope(session: AuthenticatedSession, query: DashboardQuery) {
  if (isWorkspaceManager(session)) {
    return;
  }

  if (query.agent && query.agent !== session.user.name) {
    const error = new Error("Agents can only view their own analytics.");
    error.name = "FORBIDDEN";
    throw error;
  }

  if (query.team && query.team !== "all") {
    const error = new Error("Agents can only view their own analytics.");
    error.name = "FORBIDDEN";
    throw error;
  }
}

export async function buildDashboardSnapshotFromDatabase(
  session: AuthenticatedSession,
  query: DashboardQuery,
): Promise<{
  agents: DashboardAgentRow[];
  charts: {
    channelDistribution: DashboardDistributionSlice[];
    conversationTrend: DashboardTrendPoint[];
    slaDistribution: DashboardDistributionSlice[];
  };
  overview: DashboardOverview;
}> {
  ensureAgentScope(session, query);

  const [settings, members, conversations] = await Promise.all([
    prisma.workspaceSettings.findUniqueOrThrow({
      where: { organizationId: session.organizationId },
    }),
    prisma.member.findMany({
      include: { profile: true },
      orderBy: { profile: { fullName: "asc" } },
      where: { organizationId: session.organizationId },
    }),
    prisma.conversation.findMany({
      include: {
        assignedMember: { include: { profile: true } },
      },
      where: {
        organizationId: session.organizationId,
      },
    }),
  ]);

  const currentMember = members.find((member) => member.id === session.accountId);
  const currentAgentName = currentMember?.profile.fullName ?? session.user.name;
  const currentTeam = currentMember?.team ?? "Support";
  const allowedAgentName = isWorkspaceManager(session) ? undefined : currentAgentName;
  const range = getDateRange(query);

  const filtered = conversations.filter((conversation) => {
    const startedAt = conversation.startedAt ?? conversation.createdAt;
    if (startedAt < range.start || startedAt >= range.end) {
      return false;
    }

    const channel = toChannelLabel(conversation.channel);
    const agentName = conversation.assignedMember?.profile.fullName ?? "Unassigned";
    const team = members.find((member) => member.id === conversation.assignedMemberId)?.team ?? "Unassigned";

    if (query.channel && query.channel !== "all" && channel !== query.channel) {
      return false;
    }
    if (query.agent && query.agent !== "all" && agentName !== query.agent) {
      return false;
    }
    if (query.team && query.team !== "all" && team !== query.team) {
      return false;
    }
    if (allowedAgentName && agentName !== allowedAgentName) {
      return false;
    }
    return true;
  });

  const targetMinutes = settings.slaTargetMinutes;
  const responseMinutes = filtered
    .map((conversation) => {
      if (!conversation.firstResponseAt) return null;
      return (conversation.firstResponseAt.getTime() - (conversation.startedAt ?? conversation.createdAt).getTime()) / 60000;
    })
    .filter((value): value is number => value !== null);
  const resolvedCount = filtered.filter((conversation) => conversation.status === "RESOLVED").length;
  const openCount = filtered.filter((conversation) => conversation.status !== "RESOLVED").length;
  const totalConversations = filtered.length;
  const averageFirstResponseMinutes =
    responseMinutes.length > 0
      ? responseMinutes.reduce((total, value) => total + value, 0) / responseMinutes.length
      : null;
  const slaHits = responseMinutes.filter((value) => value <= targetMinutes).length;
  const slaCompliancePercent =
    responseMinutes.length > 0 ? (slaHits / responseMinutes.length) * 100 : null;

  const trendDates: DashboardTrendPoint[] = [];
  for (let cursor = new Date(range.start); cursor < range.end; cursor = addDays(cursor, 1)) {
    const label = formatRangeLabel(cursor);
    trendDates.push({
      conversationCount: filtered.filter((conversation) =>
        formatRangeLabel(conversation.startedAt ?? conversation.createdAt) === label,
      ).length,
      date: label,
      label,
    });
  }

  const channelDistribution = Array.from(
    filtered.reduce((map, conversation) => {
      const key = toChannelLabel(conversation.channel);
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).map(([label, value]) => ({ label, value }));

  const slaDistribution: DashboardDistributionSlice[] = [
    { label: "Within SLA", value: slaHits },
    { label: "Outside SLA", value: Math.max(responseMinutes.length - slaHits, 0) },
  ];

  const agents: DashboardAgentRow[] = members
    .filter((member) => member.role === "AGENT" || member.role === "SUPERVISOR")
    .filter((member) => {
      if (query.team && query.team !== "all" && member.team !== query.team) return false;
      if (query.agent && query.agent !== "all" && member.profile.fullName !== query.agent) return false;
      if (allowedAgentName && member.profile.fullName !== allowedAgentName) return false;
      return true;
    })
    .map((member) => {
      const memberConversations = filtered.filter(
        (conversation) => conversation.assignedMemberId === member.id,
      );
      const memberResponses = memberConversations
        .map((conversation) => {
          if (!conversation.firstResponseAt) return null;
          return (conversation.firstResponseAt.getTime() - (conversation.startedAt ?? conversation.createdAt).getTime()) / 60000;
        })
        .filter((value): value is number => value !== null);
      const memberSlaHits = memberResponses.filter((value) => value <= targetMinutes).length;

      return {
        agentName: member.profile.fullName,
        assignedCount: memberConversations.length,
        averageFirstResponseMinutes:
          memberResponses.length > 0
            ? memberResponses.reduce((total, value) => total + value, 0) / memberResponses.length
            : null,
        currentWorkload: memberConversations.filter((conversation) => conversation.status !== "RESOLVED").length,
        resolvedCount: memberConversations.filter((conversation) => conversation.status === "RESOLVED").length,
        slaCompliancePercent:
          memberResponses.length > 0 ? (memberSlaHits / memberResponses.length) * 100 : null,
        team: member.team,
      };
    });

  return {
    agents,
    charts: {
      channelDistribution,
      conversationTrend: trendDates,
      slaDistribution,
    },
    overview: {
      appliedFilters: {
        agent: query.agent ?? (allowedAgentName ?? "all"),
        channel: query.channel ?? "all",
        dateRange: query.dateRange ?? "last7",
        endDate: query.endDate ?? "",
        startDate: query.startDate ?? "",
        team: query.team ?? (isWorkspaceManager(session) ? "all" : currentTeam),
      },
      currentUser: {
        agentName: currentAgentName,
        role: session.user.role,
        scope: isWorkspaceManager(session) ? "workspace" : "agent",
        team: currentTeam,
      },
      filters: {
        agents: members
          .filter((member) => member.role === "AGENT" || member.role === "SUPERVISOR")
          .map((member) => member.profile.fullName),
        channels: ["Facebook", "Instagram", "LINE", "Telegram"],
        teams: Array.from(new Set(members.map((member) => member.team))).sort((left, right) =>
          left.localeCompare(right),
        ),
      },
      isEmpty: totalConversations === 0,
      kpis: {
        averageFirstResponseMinutes: {
          label: "Average first response",
          value: averageFirstResponseMinutes,
          valueDisplay:
            averageFirstResponseMinutes === null
              ? "No data"
              : `${averageFirstResponseMinutes.toFixed(1)} min`,
        },
        openConversations: {
          label: "Open conversations",
          value: openCount,
          valueDisplay: String(openCount),
        },
        resolvedConversations: {
          label: "Resolved conversations",
          value: resolvedCount,
          valueDisplay: String(resolvedCount),
        },
        slaCompliancePercent: {
          label: "SLA compliance",
          value: slaCompliancePercent,
          valueDisplay:
            slaCompliancePercent === null ? "No data" : `${Math.round(slaCompliancePercent)}%`,
        },
        totalConversations: {
          label: "Total conversations",
          value: totalConversations,
          valueDisplay: String(totalConversations),
        },
      },
      lastUpdatedAt: new Date().toISOString(),
      workspace: {
        businessName: settings.businessName,
        slaTargetMinutes: settings.slaTargetMinutes,
        timezone: settings.timezone,
      },
    },
  };
}
