"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Toast } from "@/components/ui/toast";
import { classNames } from "@/lib/class-names";
import { ApiError } from "@/lib/http/api-error";
import {
  connectIntegration,
  disconnectIntegration,
  getIntegrations,
  reconnectIntegration,
  testIntegration,
} from "../services/integration-service";
import type {
  IntegrationProvider,
  IntegrationRecord,
  IntegrationStatus,
} from "../types/integrations";

const statusOptions: Array<{ label: string; value: IntegrationStatus | "all" }> = [
  { label: "All statuses", value: "all" },
  { label: "Connected", value: "connected" },
  { label: "Disconnected", value: "disconnected" },
  { label: "Expired", value: "expired" },
  { label: "Error", value: "error" },
  { label: "Coming soon", value: "coming_soon" },
];

const providerAccents: Record<IntegrationProvider, string> = {
  facebook: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
  lazada: "bg-orange-100 text-orange-700",
  line: "bg-emerald-100 text-emerald-700",
  shopee: "bg-red-100 text-red-700",
  telegram: "bg-sky-100 text-sky-700",
  tiktok: "bg-slate-100 text-slate-700",
  "tiktok-shop": "bg-violet-100 text-violet-700",
  x: "bg-zinc-200 text-zinc-800",
};

function formatCheckedAt(value: string | null) {
  if (!value) {
    return "Not checked yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function IntegrationsWorkspace() {
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<IntegrationStatus | "all">(
    "all",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error">("success");
  const [dialogProvider, setDialogProvider] = useState<IntegrationRecord | null>(
    null,
  );
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isDialogSubmitting, setIsDialogSubmitting] = useState(false);
  const [disconnectProvider, setDisconnectProvider] =
    useState<IntegrationRecord | null>(null);
  const [pendingProvider, setPendingProvider] = useState<IntegrationProvider | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadIntegrations() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextIntegrations = await getIntegrations();

        if (!isMounted) {
          return;
        }

        setIntegrations(nextIntegrations);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "We couldn't load integrations right now.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadIntegrations();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const filteredIntegrations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return integrations.filter((integration) => {
      const matchesStatus =
        statusFilter === "all" ? true : integration.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        integration.providerName.toLowerCase().includes(normalizedSearch) ||
        integration.capabilities.some((capability) =>
          capability.toLowerCase().includes(normalizedSearch),
        )
      );
    });
  }, [integrations, searchTerm, statusFilter]);

  const updateIntegration = (next: IntegrationRecord) => {
    setIntegrations((current) =>
      current.map((integration) =>
        integration.id === next.id ? next : integration,
      ),
    );
  };

  const handleConnectSubmit = async () => {
    if (!dialogProvider || !selectedAccountId) {
      setDialogError("Choose a mock business account");
      return;
    }

    setDialogError(null);
    setIsDialogSubmitting(true);

    try {
      const result = await connectIntegration(dialogProvider.id, selectedAccountId);
      updateIntegration(result.integration);
      setDialogProvider(null);
      setSelectedAccountId("");
      setToastTone("success");
      setToastMessage(result.message);
    } catch (error) {
      setDialogError(
        error instanceof ApiError ? error.message : "Unable to connect provider.",
      );
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const handleReconnect = async (provider: IntegrationProvider) => {
    setPendingProvider(provider);

    try {
      const result = await reconnectIntegration(provider);
      updateIntegration(result.integration);
      setToastTone("success");
      setToastMessage(result.message);
    } catch (error) {
      setToastTone("error");
      setToastMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to reconnect provider.",
      );
    } finally {
      setPendingProvider(null);
    }
  };

  const handleTest = async (provider: IntegrationProvider) => {
    setPendingProvider(provider);

    try {
      const result = await testIntegration(provider);
      updateIntegration(result.integration);
      setToastTone("success");
      setToastMessage(result.message);
    } catch (error) {
      setToastTone("error");
      setToastMessage(
        error instanceof ApiError ? error.message : "Unable to test connection.",
      );
    } finally {
      setPendingProvider(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectProvider) {
      return;
    }

    setPendingProvider(disconnectProvider.id);

    try {
      const result = await disconnectIntegration(disconnectProvider.id);
      updateIntegration(result.integration);
      setDisconnectProvider(null);
      setToastTone("success");
      setToastMessage(result.message);
    } catch (error) {
      setToastTone("error");
      setToastMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to disconnect provider.",
      );
    } finally {
      setPendingProvider(null);
    }
  };

  return (
    <>
      <main
        data-testid="integrations-page"
        className="flex h-full min-h-[calc(100vh-97px)] flex-col px-4 py-4 lg:px-6 lg:py-6"
      >
        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                Integration hub
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Review connected channels, recover expired or failing providers,
                and simulate connection health checks from one responsive hub.
              </p>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <Input
                data-testid="integration-search"
                placeholder="Search integrations"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <select
                data-testid="integration-status-filter"
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:border-cyan-500 dark:focus-visible:ring-slate-800"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as IntegrationStatus | "all",
                  )
                }
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-slate-500 dark:text-slate-400">
                <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
                Loading integrations...
              </div>
            ) : errorMessage ? (
              <ErrorState message={errorMessage} />
            ) : filteredIntegrations.length === 0 ? (
              <EmptyState
                title="No integrations found"
                description="Try a different search term or status filter."
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredIntegrations.map((integration) => (
                  <article
                    key={integration.id}
                    data-testid={`integration-card-${integration.id}`}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/70"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={classNames(
                              "flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold",
                              providerAccents[integration.id],
                            )}
                          >
                            {integration.providerName
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-slate-950 dark:text-slate-100">
                              {integration.providerName}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {integration.requiredAccountType}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={mapStatusTone(integration.status)}>
                            {integration.status.replace("_", " ")}
                          </StatusBadge>
                          {integration.capabilities.map((capability) => (
                            <span
                              key={capability}
                              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {capability}
                            </span>
                          ))}
                        </div>

                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                          <p>
                            Account: {integration.accountName ?? "Not connected"}
                          </p>
                          <p>Last checked: {formatCheckedAt(integration.lastCheckedAt)}</p>
                        </div>
                        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {integration.permissionsHint}
                        </p>
                      </div>

                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-44">
                        {renderActions({
                          integration,
                          onConnect: () => {
                            setDialogProvider(integration);
                            setSelectedAccountId(
                              integration.availableAccounts[0]?.id ?? "",
                            );
                            setDialogError(null);
                          },
                          onDisconnect: () => setDisconnectProvider(integration),
                          onReconnect: () => void handleReconnect(integration.id),
                          onTest: () => void handleTest(integration.id),
                          pendingProvider,
                        })}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Modal
        isOpen={Boolean(dialogProvider)}
        onClose={() => {
          setDialogProvider(null);
          setDialogError(null);
        }}
        title={`Connect ${dialogProvider?.providerName ?? "provider"}`}
      >
        <div data-testid="connection-dialog" className="space-y-6">
          {dialogError ? <ErrorState message={dialogError} /> : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100">
              1. Requirements and permissions
            </h3>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
              {dialogProvider?.requiredAccountType}. {dialogProvider?.permissionsHint}
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100">
              2. Simulated authorization
            </h3>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
              This mock flow simulates provider authorization without requesting
              any real credentials or secrets.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100">
              3. Select a mock business account
            </h3>
            <select
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:border-cyan-500 dark:focus-visible:ring-slate-800"
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              disabled={isDialogSubmitting}
            >
              {dialogProvider?.availableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-100">
              4. Run a mock connection test
            </h3>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
              The selected account will be marked connected and immediately
              verified with a safe mock health check.
            </p>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setDialogProvider(null)}
              disabled={isDialogSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              loading={isDialogSubmitting}
              onClick={() => void handleConnectSubmit()}
            >
              Connect and test
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(disconnectProvider)}
        onClose={() => setDisconnectProvider(null)}
        title={`Disconnect ${disconnectProvider?.providerName ?? "provider"}`}
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            Disconnecting this provider will remove the active mock connection
            and mark it unavailable until you reconnect it again.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setDisconnectProvider(null)}
              disabled={pendingProvider === disconnectProvider?.id}
            >
              Cancel
            </Button>
            <Button
              data-testid="confirm-disconnect-button"
              className="w-full sm:w-auto"
              variant="primary"
              loading={pendingProvider === disconnectProvider?.id}
              onClick={() => void handleDisconnect()}
            >
              Disconnect
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={toastMessage} tone={toastTone} />
    </>
  );
}

function mapStatusTone(status: IntegrationStatus) {
  switch (status) {
    case "connected":
      return "published";
    case "disconnected":
      return "draft";
    case "expired":
      return "scheduled";
    case "error":
      return "failed";
    case "coming_soon":
      return "draft";
  }
}

function renderActions({
  integration,
  onConnect,
  onDisconnect,
  onReconnect,
  onTest,
  pendingProvider,
}: {
  integration: IntegrationRecord;
  onConnect: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
  onTest: () => void;
  pendingProvider: IntegrationProvider | null;
}) {
  const isPending = pendingProvider === integration.id;

  if (integration.status === "coming_soon") {
    return (
      <Button variant="secondary" className="w-full" disabled>
        Coming soon
      </Button>
    );
  }

  if (integration.status === "disconnected") {
    return (
      <Button
        data-testid={`connect-${integration.id}`}
        className="w-full"
        onClick={onConnect}
      >
        Connect
      </Button>
    );
  }

  if (integration.status === "expired") {
    return (
      <>
        <Button
          className="w-full"
          variant="secondary"
          loading={isPending}
          onClick={onReconnect}
        >
          Reconnect
        </Button>
        <Button
          data-testid={`test-${integration.id}`}
          className="w-full"
          variant="secondary"
          loading={isPending}
          onClick={onTest}
        >
          Test
        </Button>
      </>
    );
  }

  if (integration.status === "error") {
    return (
      <>
        <Button
          className="w-full"
          variant="secondary"
          loading={isPending}
          onClick={onReconnect}
        >
          Retry
        </Button>
        <Button
          data-testid={`test-${integration.id}`}
          className="w-full"
          variant="secondary"
          loading={isPending}
          onClick={onTest}
        >
          Test
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        data-testid={`test-${integration.id}`}
        className="w-full"
        variant="secondary"
        loading={isPending}
        onClick={onTest}
      >
        Test
      </Button>
      <Button
        className="w-full"
        variant="secondary"
        disabled
      >
        Configure
      </Button>
      <Button
        data-testid={`disconnect-${integration.id}`}
        className="w-full"
        variant="secondary"
        onClick={onDisconnect}
      >
        Disconnect
      </Button>
    </>
  );
}
