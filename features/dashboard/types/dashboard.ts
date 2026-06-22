import type { InboxChannel } from "@/features/inbox/types/inbox";

export type DashboardDateRange = "custom" | "last7" | "last30" | "today";

export type DashboardQuery = {
  agent?: string;
  channel?: InboxChannel | "all";
  dateRange?: DashboardDateRange;
  endDate?: string;
  startDate?: string;
  team?: string;
};

export type DashboardAppliedFilters = {
  agent: string;
  channel: InboxChannel | "all";
  dateRange: DashboardDateRange;
  endDate: string;
  startDate: string;
  team: string;
};

export type DashboardKpi = {
  label: string;
  value: number | null;
  valueDisplay: string;
};

export type DashboardOverview = {
  appliedFilters: DashboardAppliedFilters;
  currentUser: {
    agentName: string;
    role: string;
    scope: "agent" | "workspace";
    team: string;
  };
  filters: {
    agents: string[];
    channels: InboxChannel[];
    teams: string[];
  };
  isEmpty: boolean;
  kpis: {
    averageFirstResponseMinutes: DashboardKpi;
    openConversations: DashboardKpi;
    resolvedConversations: DashboardKpi;
    slaCompliancePercent: DashboardKpi;
    totalConversations: DashboardKpi;
  };
  lastUpdatedAt: string;
  workspace: {
    businessName: string;
    slaTargetMinutes: number;
    timezone: string;
  };
};

export type DashboardTrendPoint = {
  conversationCount: number;
  date: string;
  label: string;
};

export type DashboardDistributionSlice = {
  label: string;
  value: number;
};

export type DashboardAgentRow = {
  agentName: string;
  assignedCount: number;
  averageFirstResponseMinutes: number | null;
  currentWorkload: number;
  resolvedCount: number;
  slaCompliancePercent: number | null;
  team: string;
};

export type DashboardOverviewResponse = {
  overview: DashboardOverview;
};

export type DashboardTrendsResponse = {
  charts: {
    channelDistribution: DashboardDistributionSlice[];
    conversationTrend: DashboardTrendPoint[];
    slaDistribution: DashboardDistributionSlice[];
  };
};

export type DashboardAgentsResponse = {
  agents: DashboardAgentRow[];
};
