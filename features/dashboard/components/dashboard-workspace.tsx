"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { Dropdown } from "@/components/ui/dropdown";
import { DatePicker } from "@/components/ui/date-picker";
import { ApiError } from "@/lib/http/api-error";
import {
  getDashboardAgents,
  getDashboardOverview,
  getDashboardTrends,
} from "../services/dashboard-service";
import type {
  DashboardAgentRow,
  DashboardDateRange,
  DashboardDistributionSlice,
  DashboardOverview,
  DashboardQuery,
  DashboardTrendPoint,
} from "../types/dashboard";

const dateRangeOptions: DashboardDateRange[] = ["today", "last7", "last30", "custom"];

const chartPalette = ["#06b6d4", "#0f172a", "#14b8a6", "#f59e0b", "#ec4899"];
const kpiTranslationKeys = {
  averageFirstResponseMinutes: "averageResponse",
  openConversations: "openConversations",
  resolvedConversations: "resolvedConversations",
  slaCompliancePercent: "slaCompliance",
  totalConversations: "totalConversations",
} as const;

function isForbidden(error: unknown) {
  return error instanceof ApiError && error.status === 403;
}

function buildInitialQuery(): DashboardQuery {
  return {
    agent: "all",
    channel: "all",
    dateRange: "last7",
    team: "all",
  };
}

export function DashboardWorkspace() {
  const locale = useLocale();
  const format = useFormatter();
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const formatMetric = (value: number | null, suffix: "%" | "min") => {
    if (value === null) return tCommon("noData");
    return suffix === "%"
      ? format.number(value / 100, { style: "percent", maximumFractionDigits: 0 })
      : t("minutes", { value: format.number(value, { maximumFractionDigits: 1 }) });
  };
  const [query, setQuery] = useState<DashboardQuery>(buildInitialQuery);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [charts, setCharts] = useState<{
    channelDistribution: DashboardDistributionSlice[];
    conversationTrend: DashboardTrendPoint[];
    slaDistribution: DashboardDistributionSlice[];
  } | null>(null);
  const [agents, setAgents] = useState<DashboardAgentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbiddenState, setIsForbiddenState] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage(null);
      setIsForbiddenState(false);

      try {
        const [nextOverview, nextCharts, nextAgents] = await Promise.all([
          getDashboardOverview(query),
          getDashboardTrends(query),
          getDashboardAgents(query),
        ]);

        if (!isMounted) {
          return;
        }

        setOverview(nextOverview);
        setCharts(nextCharts);
        setAgents(nextAgents);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setIsForbiddenState(isForbidden(error));
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : t("error"),
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [query, t]);

  const appliedFilters = overview?.appliedFilters;
  const filterOptions = overview?.filters;
  const isAgentScope = overview?.currentUser.scope === "agent";
  const trendSummary = useMemo(() => {
    if (!charts?.conversationTrend.length) {
      return "No conversation trend data.";
    }

    const busiest = charts.conversationTrend.reduce((best, point) =>
      point.conversationCount > best.conversationCount ? point : best,
    );

    return `Busiest day: ${busiest.label} with ${busiest.conversationCount} conversations.`;
  }, [charts]);

  const channelSummary = useMemo(() => {
    if (!charts?.channelDistribution.length) {
      return "No channel distribution data.";
    }

    const topChannel = charts.channelDistribution[0];
    return `${topChannel.label} leads with ${topChannel.value} conversations.`;
  }, [charts]);

  const slaSummary = useMemo(() => {
    if (!charts) {
      return "No SLA data.";
    }

    return charts.slaDistribution
      .map((slice) => `${slice.label}: ${slice.value}`)
      .join(", ");
  }, [charts]);

  return (
    <main
      data-testid="dashboard-page"
      className="flex h-full min-h-[calc(100vh-97px)] flex-col px-4 py-4 lg:px-6 lg:py-6"
    >
      <div className="space-y-4">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                {t("title")}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {t("description")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {overview ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  {t("lastUpdated", { date: format.dateTime(new Date(overview.lastUpdatedAt), { dateStyle: "medium", timeStyle: "short", timeZone: overview.workspace.timezone }) })}
                </div>
              ) : null}
              <Button
                className="w-auto"
                onClick={() => setQuery((current) => ({ ...current }))}
                variant="secondary"
              >
                {tCommon("refresh")}
              </Button>
            </div>
          </div>
          {overview ? (
            <div className="mt-4">
              <Alert tone="info">
                {overview.workspace.businessName} targets a first response
                within {overview.workspace.slaTargetMinutes} minutes.{" "}
                {overview.currentUser.scope === "agent"
                  ? "Your dashboard is scoped to your own analytics."
                  : "Workspace-level analytics are visible for your role."}
              </Alert>
            </div>
          ) : null}
        </section>

        <section
          data-testid="dashboard-filters"
          className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
        >
          <div className="grid gap-3 xl:grid-cols-[180px_repeat(4,minmax(0,1fr))_auto]">
            <FilterField label={t("dateRange")} testId="dashboard-date-range">
              <Dropdown
                ariaLabel={t("dateRange")}
                value={query.dateRange ?? "last7"}
                onChange={(value) =>
                  setQuery((current) => ({
                    ...current,
                    dateRange: value as DashboardDateRange,
                  }))
                }
                options={dateRangeOptions.map((option) => ({ label: t(option), value: option }))}
              />
            </FilterField>

            <FilterField label={t("channel")}>
              <Dropdown
                ariaLabel={t("channel")}
                value={query.channel ?? "all"}
                onChange={(value) =>
                  setQuery((current) => ({
                    ...current,
                    channel: value as DashboardQuery["channel"],
                  }))
                }
                options={[{ label: t("allChannels"), value: "all" }, ...(filterOptions?.channels ?? []).map((channel) => ({ label: channel, value: channel }))]}
              />
            </FilterField>

            <FilterField label={t("team")}>
              <Dropdown
                ariaLabel={t("team")}
                disabled={isAgentScope}
                value={appliedFilters?.team ?? query.team ?? "all"}
                onChange={(value) =>
                  setQuery((current) => ({
                    ...current,
                    team: value,
                  }))
                }
                options={[{ label: t("allTeams"), value: "all" }, ...(filterOptions?.teams ?? []).map((team) => ({ label: team, value: team }))]}
              />
            </FilterField>

            <FilterField label={t("agent")}>
              <Dropdown
                ariaLabel={t("agent")}
                disabled={isAgentScope}
                value={appliedFilters?.agent ?? query.agent ?? "all"}
                onChange={(value) =>
                  setQuery((current) => ({
                    ...current,
                    agent: value,
                  }))
                }
                options={[{ label: t("allAgents"), value: "all" }, ...(filterOptions?.agents ?? []).map((agentName) => ({ label: agentName, value: agentName }))]}
              />
            </FilterField>

            {query.dateRange === "custom" ? (
              <>
                <FilterField label="Start date">
                  <DatePicker
                    ariaLabel="Start date"
                    value={query.startDate ?? ""}
                    onChange={(value) =>
                      setQuery((current) => ({
                        ...current,
                        startDate: value,
                      }))
                    }
                  />
                </FilterField>
                <FilterField label="End date">
                  <DatePicker
                    ariaLabel="End date"
                    value={query.endDate ?? ""}
                    onChange={(value) =>
                      setQuery((current) => ({
                        ...current,
                        endDate: value,
                      }))
                    }
                  />
                </FilterField>
              </>
            ) : null}
          </div>
        </section>

        {isLoading ? (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
              {t("loading")}
            </div>
          </section>
        ) : isForbiddenState ? (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <ErrorState
              description={errorMessage ?? "You do not have access to this analytics scope."}
              title="Analytics access is restricted"
            />
          </section>
        ) : errorMessage ? (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <ErrorState
              actionLabel={tCommon("retry")}
              description={errorMessage}
              onAction={() => setQuery((current) => ({ ...current }))}
              testId="dashboard-retry-button"
              title={t("errorTitle")}
            />
          </section>
        ) : overview?.isEmpty ? (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <EmptyState
              description={t("empty")}
              title={t("emptyTitle")}
            />
          </section>
        ) : overview && charts ? (
          <>
            <section
              data-testid="dashboard-kpis"
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
            >
              {Object.entries(overview.kpis).map(([key, kpi]) => (
                <article
                  key={kpi.label}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {t(kpiTranslationKeys[key as keyof typeof kpiTranslationKeys])}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                    {locale === "en" ? kpi.valueDisplay : key === "averageFirstResponseMinutes" ? formatMetric(kpi.value, "min") : key === "slaCompliancePercent" ? formatMetric(kpi.value, "%") : kpi.value === null ? tCommon("noData") : format.number(kpi.value)}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <ChartCard
                summary={trendSummary}
                testId="conversation-trend-chart"
                title={t("conversationTrend")}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.conversationTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="conversationCount" radius={[14, 14, 0, 0]} fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                summary={channelSummary}
                testId="channel-distribution-chart"
                title={t("channelDistribution")}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={charts.channelDistribution}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={88}
                      paddingAngle={4}
                    >
                      {charts.channelDistribution.map((entry, index) => (
                        <Cell key={entry.label} fill={chartPalette[index % chartPalette.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>

            <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
              <ChartCard summary={slaSummary} testId="sla-chart" title={t("slaPerformance")}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={charts.slaDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[14, 14, 0, 0]}>
                      {charts.slaDistribution.map((entry, index) => (
                        <Cell
                          key={entry.label}
                          fill={index === 0 ? "#10b981" : "#f59e0b"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <section
                data-testid="agent-performance-table"
                className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-100">
                    {t("agentPerformance")}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Assigned, resolved, response speed, SLA compliance, and current workload.
                  </p>
                </div>

                <div className="hidden overflow-x-auto rounded-[1.5rem] border border-slate-200 dark:border-slate-800 lg:block">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-3 font-semibold">{t("agent")}</th>
                        <th className="px-4 py-3 font-semibold">{t("assigned")}</th>
                        <th className="px-4 py-3 font-semibold">{t("resolved")}</th>
                        <th className="px-4 py-3 font-semibold">{t("averageResponse")}</th>
                        <th className="px-4 py-3 font-semibold">SLA</th>
                        <th className="px-4 py-3 font-semibold">{t("workload")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                      {agents.map((agent) => (
                        <tr key={agent.agentName}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                              {agent.agentName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {agent.team}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{agent.assignedCount}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{agent.resolvedCount}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{formatMetric(agent.averageFirstResponseMinutes, "min")}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{formatMetric(agent.slaCompliancePercent, "%")}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{agent.currentWorkload}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 lg:hidden">
                  {agents.map((agent) => (
                    <article
                      key={agent.agentName}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                            {agent.agentName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {agent.team}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white dark:bg-cyan-500 dark:text-slate-950">
                          {agent.currentWorkload} active
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-300">
                        <MetricTile label={t("assigned")} value={format.number(agent.assignedCount)} />
                        <MetricTile label={t("resolved")} value={format.number(agent.resolvedCount)} />
                        <MetricTile label={t("averageResponse")} value={formatMetric(agent.averageFirstResponseMinutes, "min")} />
                        <MetricTile label="SLA" value={formatMetric(agent.slaCompliancePercent, "%")} />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function ChartCard({
  children,
  summary,
  testId,
  title,
}: {
  children: React.ReactNode;
  summary: string;
  testId: string;
  title: string;
}) {
  return (
    <section
      data-testid={testId}
      className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5"
    >
      <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{summary}</p>
      <p className="sr-only">{summary}</p>
      <div className="mt-4 h-[260px]">{children}</div>
    </section>
  );
}

function FilterField({
  children,
  label,
  testId,
}: {
  children: React.ReactNode;
  label: string;
  testId?: string;
}) {
  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {children}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
