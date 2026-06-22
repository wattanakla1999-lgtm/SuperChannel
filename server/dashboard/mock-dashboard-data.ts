import "server-only";

import type {
  DashboardAgentRow,
  DashboardAppliedFilters,
  DashboardDistributionSlice,
  DashboardOverview,
  DashboardQuery,
  DashboardTrendPoint,
} from "@/features/dashboard/types/dashboard";
import type { AuthenticatedUser } from "@/features/login/types/auth";
import { listMockAnalyticsConversationRecords, getMockAssignmentMetrics } from "@/server/customers/mock-customer-data";
import { getMockSettings } from "@/server/settings/mock-settings-data";
import { getMockTeamMemberByAccountId, listMockTeamMembersForDashboard } from "@/server/team/mock-team-data";

const DASHBOARD_REFERENCE_NOW = "2026-06-22T12:00:00.000Z";
const DEFAULT_SLA_TARGET_MINUTES = 15;

type DashboardSession = {
  accountId: string;
  id: string;
  user: AuthenticatedUser;
};

type ScopedRecord = {
  agentName: string;
  channel: string;
  firstResponseAt: string | null;
  id: string;
  lastActivityAt: string;
  resolvedAt: string | null;
  startedAt: string;
  status: string;
  team: string;
};

type DashboardSnapshot = {
  agents: DashboardAgentRow[];
  charts: {
    channelDistribution: DashboardDistributionSlice[];
    conversationTrend: DashboardTrendPoint[];
    slaDistribution: DashboardDistributionSlice[];
  };
  overview: DashboardOverview;
};

function isWorkspaceRole(role: string) {
  return role === "Owner" || role === "Admin" || role === "Supervisor";
}

function shiftDate(date: string, offsetDays: number) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + offsetDays);
  return next.toISOString().slice(0, 10);
}

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function formatAverageMinutes(value: number | null) {
  if (value === null) {
    return "No data";
  }

  return `${value.toFixed(1)} min`;
}

function formatPercentage(value: number | null) {
  if (value === null) {
    return "No data";
  }

  return `${Math.round(value)}%`;
}

function getDateKey(value: string) {
  return value.slice(0, 10);
}

function getMinuteDifference(start: string, end: string) {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60_000;
}

function getAverage(values: number[]) {
  if (!values.length) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getPercentage(numerator: number, denominator: number) {
  if (denominator === 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

function normalizeQuery(
  session: DashboardSession,
  query: DashboardQuery,
) {
  const today = DASHBOARD_REFERENCE_NOW.slice(0, 10);
  const dateRange = query.dateRange ?? "last7";
  const startDate =
    dateRange === "today"
      ? today
      : dateRange === "last30"
        ? shiftDate(today, -29)
        : dateRange === "custom"
          ? query.startDate ?? today
          : shiftDate(today, -6);
  const endDate =
    dateRange === "custom" ? query.endDate ?? today : today;
  const currentMember = getMockTeamMemberByAccountId(session.id, session.accountId);

  if (!currentMember) {
    const error = new Error("Unable to resolve the current team member.");
    error.name = "FORBIDDEN";
    throw error;
  }

  if (!isWorkspaceRole(session.user.role)) {
    if (query.agent && query.agent !== currentMember.name) {
      const error = new Error("Agents can only view their own analytics.");
      error.name = "FORBIDDEN";
      throw error;
    }

    if (query.team && query.team !== currentMember.team) {
      const error = new Error("Agents can only view their own analytics.");
      error.name = "FORBIDDEN";
      throw error;
    }
  }

  return {
    appliedFilters: {
      agent: isWorkspaceRole(session.user.role)
        ? query.agent ?? "all"
        : currentMember.name,
      channel: query.channel ?? "all",
      dateRange,
      endDate,
      startDate,
      team: isWorkspaceRole(session.user.role)
        ? query.team ?? "all"
        : currentMember.team,
    } satisfies DashboardAppliedFilters,
    currentMember,
    scope: (isWorkspaceRole(session.user.role)
      ? "workspace"
      : "agent") as "agent" | "workspace",
  };
}

function createScopedRecords(session: DashboardSession, query: DashboardQuery) {
  const normalized = normalizeQuery(session, query);
  const teamMembers = listMockTeamMembersForDashboard(session.id);
  const teamByAgent = new Map(teamMembers.map((member) => [member.name, member.team]));
  const eligibleMembers = teamMembers.filter(
    (member) =>
      (member.role === "Agent" || member.role === "Supervisor") &&
      member.accountStatus === "active",
  );

  const records = listMockAnalyticsConversationRecords(session.id)
    .map((record) => ({
      agentName: record.assignedAgent,
      channel: record.channel,
      firstResponseAt: record.firstResponseAt,
      id: record.id,
      lastActivityAt: record.lastActivityAt,
      resolvedAt: record.resolvedAt,
      startedAt: record.startedAt,
      status: record.status,
      team: teamByAgent.get(record.assignedAgent) ?? "Unassigned",
    } satisfies ScopedRecord))
    .filter((record) => {
      if (
        normalized.appliedFilters.channel !== "all" &&
        record.channel !== normalized.appliedFilters.channel
      ) {
        return false;
      }

      if (
        normalized.appliedFilters.team !== "all" &&
        record.team !== normalized.appliedFilters.team
      ) {
        return false;
      }

      if (
        normalized.appliedFilters.agent !== "all" &&
        record.agentName !== normalized.appliedFilters.agent
      ) {
        return false;
      }

      return true;
    });

  return {
    eligibleMembers,
    normalized,
    records,
    teamByAgent,
  };
}

function isStartedInRange(record: ScopedRecord, filters: DashboardAppliedFilters) {
  const dateKey = getDateKey(record.startedAt);
  return dateKey >= filters.startDate && dateKey <= filters.endDate;
}

function isResolvedInRange(record: ScopedRecord, filters: DashboardAppliedFilters) {
  if (!record.resolvedAt) {
    return false;
  }

  const dateKey = getDateKey(record.resolvedAt);
  return dateKey >= filters.startDate && dateKey <= filters.endDate;
}

export function buildMockDashboardSnapshot(
  session: DashboardSession,
  query: DashboardQuery,
): DashboardSnapshot {
  const { eligibleMembers, normalized, records } = createScopedRecords(session, query);
  const settings = getMockSettings(session.id, session.user);
  const startedRecords = records.filter((record) =>
    isStartedInRange(record, normalized.appliedFilters),
  );
  const resolvedRecords = records.filter((record) =>
    isResolvedInRange(record, normalized.appliedFilters),
  );
  const firstResponseDurations = startedRecords
    .filter((record) => record.firstResponseAt)
    .map((record) => getMinuteDifference(record.startedAt, record.firstResponseAt!));
  const slaMetCount = firstResponseDurations.filter(
    (minutes) => minutes <= DEFAULT_SLA_TARGET_MINUTES,
  ).length;
  const averageFirstResponseMinutes = getAverage(firstResponseDurations);
  const slaCompliancePercent = getPercentage(
    slaMetCount,
    firstResponseDurations.length,
  );
  const assignmentMetrics = getMockAssignmentMetrics(session.id);
  const trendDates: string[] = [];
  let cursor = normalized.appliedFilters.startDate;

  while (cursor <= normalized.appliedFilters.endDate) {
    trendDates.push(cursor);
    cursor = shiftDate(cursor, 1);
  }

  const conversationTrend = trendDates.map((date) => ({
    conversationCount: startedRecords.filter(
      (record) => getDateKey(record.startedAt) === date,
    ).length,
    date,
    label: formatDateLabel(date),
  }));

  const channelDistribution = Array.from(
    startedRecords.reduce((accumulator, record) => {
      accumulator.set(record.channel, (accumulator.get(record.channel) ?? 0) + 1);
      return accumulator;
    }, new Map<string, number>()),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));

  const slaDistribution = [
    { label: "Met", value: slaMetCount },
    { label: "Breached", value: Math.max(firstResponseDurations.length - slaMetCount, 0) },
  ];

  const membersToRender = eligibleMembers.filter((member) => {
    if (
      normalized.appliedFilters.team !== "all" &&
      member.team !== normalized.appliedFilters.team
    ) {
      return false;
    }

    if (
      normalized.appliedFilters.agent !== "all" &&
      member.name !== normalized.appliedFilters.agent
    ) {
      return false;
    }

    return true;
  });

  const agents = membersToRender
    .map((member) => {
      const memberRecords = startedRecords.filter(
        (record) => record.agentName === member.name,
      );
      const memberResolved = resolvedRecords.filter(
        (record) => record.agentName === member.name,
      );
      const memberDurations = memberRecords
        .filter((record) => record.firstResponseAt)
        .map((record) => getMinuteDifference(record.startedAt, record.firstResponseAt!));
      const memberSlaMet = memberDurations.filter(
        (minutes) => minutes <= DEFAULT_SLA_TARGET_MINUTES,
      ).length;
      const workload = assignmentMetrics.get(member.name)?.activeConversationCount ?? 0;

      return {
        agentName: member.name,
        assignedCount: memberRecords.length,
        averageFirstResponseMinutes: getAverage(memberDurations),
        currentWorkload: workload,
        resolvedCount: memberResolved.length,
        slaCompliancePercent: getPercentage(memberSlaMet, memberDurations.length),
        team: member.team,
      } satisfies DashboardAgentRow;
    })
    .filter((member) => {
      if (normalized.appliedFilters.agent !== "all") {
        return true;
      }

      return member.assignedCount > 0 || member.currentWorkload > 0;
    })
    .sort(
      (left, right) =>
        right.assignedCount - left.assignedCount ||
        right.currentWorkload - left.currentWorkload ||
        left.agentName.localeCompare(right.agentName),
    );

  return {
    agents,
    charts: {
      channelDistribution,
      conversationTrend,
      slaDistribution,
    },
    overview: {
      appliedFilters: normalized.appliedFilters,
      currentUser: {
        agentName: normalized.currentMember.name,
        role: session.user.role,
        scope: normalized.scope,
        team: normalized.currentMember.team,
      },
      filters: {
        agents: membersToRender.map((member) => member.name),
        channels: Array.from(new Set(records.map((record) => record.channel))).sort() as DashboardOverview["filters"]["channels"],
        teams: Array.from(new Set(eligibleMembers.map((member) => member.team))).sort(),
      },
      isEmpty: startedRecords.length === 0 && resolvedRecords.length === 0,
      kpis: {
        averageFirstResponseMinutes: {
          label: "Average first response",
          value: averageFirstResponseMinutes,
          valueDisplay: formatAverageMinutes(averageFirstResponseMinutes),
        },
        openConversations: {
          label: "Open conversations",
          value: startedRecords.filter(
            (record) => record.status === "open" || record.status === "pending",
          ).length,
          valueDisplay: String(
            startedRecords.filter(
              (record) => record.status === "open" || record.status === "pending",
            ).length,
          ),
        },
        resolvedConversations: {
          label: "Resolved conversations",
          value: resolvedRecords.length,
          valueDisplay: String(resolvedRecords.length),
        },
        slaCompliancePercent: {
          label: "SLA compliance",
          value: slaCompliancePercent,
          valueDisplay: formatPercentage(slaCompliancePercent),
        },
        totalConversations: {
          label: "Total conversations",
          value: startedRecords.length,
          valueDisplay: String(startedRecords.length),
        },
      },
      lastUpdatedAt: DASHBOARD_REFERENCE_NOW,
      workspace: {
        businessName: settings.workspaceProfile.businessName,
        slaTargetMinutes: DEFAULT_SLA_TARGET_MINUTES,
        timezone: settings.workspaceProfile.timezone,
      },
    },
  };
}
