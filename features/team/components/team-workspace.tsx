"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { Toast } from "@/components/ui/toast";
import { classNames } from "@/lib/class-names";
import { ApiError } from "@/lib/http/api-error";
import {
  getTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMember,
} from "../services/team-service";
import type {
  TeamAccountStatus,
  TeamInvitation,
  TeamListResponse,
  TeamMember,
  TeamPresence,
  TeamQuery,
  TeamRole,
} from "../types/team";

const PAGE_SIZE = 8;

const roleBadgeClasses: Record<TeamRole, string> = {
  Admin: "bg-cyan-100 text-cyan-800",
  Agent: "bg-slate-200 text-slate-700",
  Owner: "bg-amber-100 text-amber-800",
  Supervisor: "bg-violet-100 text-violet-800",
};

const accountStatusClasses: Record<Exclude<TeamAccountStatus, "invited">, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-rose-100 text-rose-700",
};

const onlineStatusClasses: Record<TeamPresence, string> = {
  away: "bg-amber-100 text-amber-700",
  offline: "bg-slate-200 text-slate-700",
  online: "bg-emerald-100 text-emerald-700",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type MemberFormState = {
  accountStatus: "active" | "inactive";
  role: TeamRole;
  team: string;
  workloadLimit: string;
};

type InviteFormState = {
  email: string;
  role: TeamRole;
  team: string;
};

const initialInviteForm: InviteFormState = {
  email: "",
  role: "Agent",
  team: "Support",
};

export function TeamWorkspace() {
  const workloadLimitInputId = useId();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamListResponse["currentUser"] | null>(
    null,
  );
  const [filters, setFilters] = useState<TeamListResponse["filters"] | null>(null);
  const [summary, setSummary] = useState<TeamListResponse["summary"] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<TeamRole | "all">("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [onlineStatusFilter, setOnlineStatusFilter] = useState<TeamPresence | "all">(
    "all",
  );
  const [accountStatusFilter, setAccountStatusFilter] = useState<
    Exclude<TeamAccountStatus, "invited"> | "all"
  >("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberForm, setMemberForm] = useState<MemberFormState | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(initialInviteForm);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "remove" | null>(
    null,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"error" | "success">("success");

  const query = useMemo<TeamQuery>(
    () => ({
      accountStatus: accountStatusFilter,
      onlineStatus: onlineStatusFilter,
      page,
      pageSize: PAGE_SIZE,
      role: roleFilter,
      search: searchTerm || undefined,
      team: teamFilter === "all" ? undefined : teamFilter,
    }),
    [accountStatusFilter, onlineStatusFilter, page, roleFilter, searchTerm, teamFilter],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadTeam() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await getTeamMembers(query);

        if (!isMounted) {
          return;
        }

        setCurrentUser(result.currentUser);
        setFilters(result.filters);
        setInvitations(result.invitations);
        setMembers(result.members);
        setSummary(result.summary);
        setTotalPages(result.pagination.totalPages);
        setPage(result.pagination.page);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof ApiError ? error.message : "We couldn't load the team workspace.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTeam();

    return () => {
      isMounted = false;
    };
  }, [query, refreshKey]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const canManageMembers = currentUser?.canManageMembers ?? false;
  const hasActiveFilters =
    Boolean(searchTerm) ||
    roleFilter !== "all" ||
    teamFilter !== "all" ||
    onlineStatusFilter !== "all" ||
    accountStatusFilter !== "all";

  const resetInviteForm = () => {
    setInviteForm(initialInviteForm);
    setInviteError(null);
  };

  const openMember = (member: TeamMember) => {
    setSelectedMember(member);
    setMemberForm({
      accountStatus: member.accountStatus,
      role: member.role,
      team: member.team,
      workloadLimit: String(member.workloadLimit),
    });
  };

  const closeMemberDrawer = () => {
    setSelectedMember(null);
    setMemberForm(null);
    setConfirmAction(null);
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim() || !inviteForm.team.trim()) {
      setInviteError("Enter a valid email and team before inviting.");
      return;
    }

    setIsInviting(true);
    setInviteError(null);

    try {
      const invitation = await inviteTeamMember({
        email: inviteForm.email.trim(),
        role: inviteForm.role,
        team: inviteForm.team.trim(),
      });

      setInvitations((current) => [invitation, ...current]);
      setSummary((current) =>
        current
          ? {
              ...current,
              pendingInvitationCount: current.pendingInvitationCount + 1,
            }
          : current,
      );
      setToastTone("success");
      setToastMessage("Invitation created");
      setIsInviteOpen(false);
      resetInviteForm();
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setInviteError(
        error instanceof ApiError ? error.message : "Unable to create invitation.",
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleSaveMember = async () => {
    if (!selectedMember || !memberForm) {
      return;
    }

    setIsSavingMember(true);

    try {
      const nextWorkloadLimit = Number(memberForm.workloadLimit);

      if (!Number.isFinite(nextWorkloadLimit)) {
        setToastTone("error");
        setToastMessage("Enter a valid workload limit.");
        return;
      }

      const updatedMember = await updateTeamMember(selectedMember.id, {
        accountStatus: memberForm.accountStatus,
        role: memberForm.role,
        team: memberForm.team.trim(),
        workloadLimit: nextWorkloadLimit,
      });

      setSelectedMember(updatedMember);
      setMembers((current) =>
        current.map((member) => (member.id === updatedMember.id ? updatedMember : member)),
      );
      setToastTone("success");
      setToastMessage("Member saved");
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setToastTone("error");
      setToastMessage(error instanceof ApiError ? error.message : "Unable to save member.");
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleConfirmedAction = async () => {
    if (!selectedMember || !confirmAction) {
      return;
    }

    if (confirmAction === "deactivate") {
      setIsSavingMember(true);

      try {
        const updatedMember = await updateTeamMember(selectedMember.id, {
          accountStatus: "inactive",
          role: memberForm?.role ?? selectedMember.role,
          team: memberForm?.team.trim() || selectedMember.team,
          workloadLimit: Number(memberForm?.workloadLimit ?? selectedMember.workloadLimit),
        });

        setSelectedMember(updatedMember);
        setMembers((current) =>
          current.map((member) => (member.id === updatedMember.id ? updatedMember : member)),
        );
        setToastTone("success");
        setToastMessage("Member deactivated");
        setRefreshKey((current) => current + 1);
      } catch (error) {
        setToastTone("error");
        setToastMessage(
          error instanceof ApiError ? error.message : "Unable to deactivate member.",
        );
      } finally {
        setConfirmAction(null);
        setIsSavingMember(false);
      }

      return;
    }

    if (confirmAction === "remove") {
      try {
        await removeTeamMember(selectedMember.id);
        setMembers((current) => current.filter((member) => member.id !== selectedMember.id));
        setSelectedMember(null);
        setToastTone("success");
        setToastMessage("Member removed");
        setRefreshKey((current) => current + 1);
      } catch (error) {
        setToastTone("error");
        setToastMessage(
          error instanceof ApiError ? error.message : "Unable to remove member.",
        );
      } finally {
        setConfirmAction(null);
      }
    }
  };

  return (
    <>
      <main
        data-testid="team-page"
        className="flex h-full min-h-[calc(100vh-97px)] flex-col px-4 py-4 lg:px-6 lg:py-6"
      >
        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                  Team management
                </h2>
                <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">
                  Search teammates, track workload, and manage invitations and access
                  without leaving the operator workspace.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatPill
                  label="Members"
                  value={summary ? String(summary.memberCount) : "0"}
                />
                <StatPill
                  label="Pending invites"
                  value={summary ? String(summary.pendingInvitationCount) : "0"}
                />
                <Button
                  className="w-auto"
                  data-testid="invite-member-button"
                  disabled={!canManageMembers}
                  onClick={() => {
                    resetInviteForm();
                    setIsInviteOpen(true);
                  }}
                >
                  Invite member
                </Button>
              </div>
            </div>

            {!canManageMembers && currentUser ? (
              <div className="mt-4">
                <Alert>
                  You have read-only access as a {currentUser.role}. Owners and Admins
                  can manage invitations and member settings.
                </Alert>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
              <Input
                data-testid="team-search"
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
              <FilterSelect
                label="Role"
                value={roleFilter}
                onChange={(value) => {
                  setRoleFilter(value as TeamRole | "all");
                  setPage(1);
                }}
                options={(filters?.roles ?? []).map((role) => ({
                  label: role,
                  value: role,
                }))}
              />
              <FilterSelect
                label="Team"
                value={teamFilter}
                onChange={(value) => {
                  setTeamFilter(value);
                  setPage(1);
                }}
                options={filters?.teams ?? []}
              />
              <FilterSelect
                label="Online status"
                value={onlineStatusFilter}
                onChange={(value) => {
                  setOnlineStatusFilter(value as TeamPresence | "all");
                  setPage(1);
                }}
                options={(filters?.onlineStatuses ?? []).map((status) => ({
                  label: status,
                  value: status,
                }))}
              />
              <FilterSelect
                label="Account status"
                value={accountStatusFilter}
                onChange={(value) => {
                  setAccountStatusFilter(
                    value as Exclude<TeamAccountStatus, "invited"> | "all",
                  );
                  setPage(1);
                }}
                options={(filters?.accountStatuses ?? [])
                  .filter((status) => status !== "invited")
                  .map((status) => ({
                    label: status,
                    value: status,
                  }))}
              />
            </div>

            {hasActiveFilters ? (
              <div className="mt-4">
                <Button
                  className="w-auto"
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setTeamFilter("all");
                    setOnlineStatusFilter("all");
                    setAccountStatusFilter("all");
                    setPage(1);
                  }}
                  variant="secondary"
                >
                  Clear filters
                </Button>
              </div>
            ) : null}
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
            {invitations.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Pending invitations
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{invitations.length} pending</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {invitations.slice(0, 3).map((invitation) => (
                    <div
                      key={invitation.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                        {invitation.email}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {invitation.role} · {invitation.team}
                      </p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Invited by {invitation.invitedBy} on{" "}
                        {formatDateTime(invitation.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="min-h-[24rem] rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {isLoading ? (
              <div className="flex min-h-[24rem] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
                Loading team members...
              </div>
            ) : errorMessage ? (
              <div className="p-6">
                <ErrorState
                  actionLabel="Retry"
                  description={errorMessage}
                  onAction={() => setRefreshKey((current) => current + 1)}
                  title="Team workspace unavailable"
                />
              </div>
            ) : members.length === 0 && hasActiveFilters ? (
              <div className="p-6">
                <EmptyState
                  description="Try adjusting the search or clearing one of the active filters."
                  title="No team members match your filters."
                />
              </div>
            ) : members.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  description="Once members are added to the workspace, they will appear here."
                  title="No team members yet"
                />
              </div>
            ) : (
              <div className="space-y-4 p-4 sm:p-5">
                <div
                  data-testid="team-member-list"
                  className="hidden overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-slate-800 lg:block"
                >
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-3 font-semibold">Member</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Team</th>
                        <th className="px-4 py-3 font-semibold">Workload</th>
                        <th className="px-4 py-3 font-semibold">Last active</th>
                        <th className="px-4 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                      {members.map((member) => (
                        <tr key={member.id} data-testid={`team-member-${member.id}`}>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="flex w-full items-start gap-3 text-left"
                              onClick={() => openMember(member)}
                            >
                              <AvatarCard member={member} />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <RoleBadge role={member.role} />
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{member.team}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            <p>{member.activeConversationCount} active</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {member.assignedConversationCount} assigned · limit {member.workloadLimit}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            {formatDateTime(member.lastActiveAt)}
                          </td>
                          <td className="px-4 py-3">
                            {canManageMembers ? (
                              <Button
                                className="w-auto"
                                onClick={() => openMember(member)}
                                variant="secondary"
                              >
                                Manage
                              </Button>
                            ) : (
                              <Button
                                className="w-auto"
                                onClick={() => openMember(member)}
                                variant="secondary"
                              >
                                View
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 lg:hidden">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      data-testid={`team-member-${member.id}`}
                      className="w-full rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-950"
                      onClick={() => openMember(member)}
                    >
                      <div className="space-y-3">
                        <AvatarCard member={member} compact />
                        <div className="flex flex-wrap gap-2">
                          <RoleBadge role={member.role} />
                          <Pill label={member.onlineStatus} tone={onlineStatusClasses[member.onlineStatus]} />
                          <Pill label={member.accountStatus} tone={accountStatusClasses[member.accountStatus]} />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <span>{member.team}</span>
                          <span>{formatDateTime(member.lastActiveAt)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Showing page {page} of {totalPages}
                  </p>
                  <Pagination
                    onPageChange={setPage}
                    page={page}
                    testId="team-pagination"
                    totalPages={totalPages}
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <Modal
        isOpen={isInviteOpen}
        onClose={() => {
          setIsInviteOpen(false);
          resetInviteForm();
        }}
        title="Invite member"
      >
        <div data-testid="invite-member-dialog" className="space-y-5">
          {inviteError ? <ErrorState message={inviteError} /> : null}
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Email</span>
            <Input
              placeholder="new.member@superchannel.local"
              value={inviteForm.email}
              onChange={(event) =>
                setInviteForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <FilterSelect
              label="Role"
              value={inviteForm.role}
              onChange={(value) =>
                setInviteForm((current) => ({ ...current, role: value as TeamRole }))
              }
              allowAll={false}
              options={(filters?.roles ?? []).map((role) => ({
                label: role,
                value: role,
              }))}
            />
            <FilterSelect
              label="Team"
              value={inviteForm.team}
              onChange={(value) =>
                setInviteForm((current) => ({ ...current, team: value }))
              }
              allowAll={false}
              options={filters?.teams ?? []}
            />
          </div>
          <div className="flex justify-end">
            <Button loading={isInviting} onClick={() => void handleInvite()} className="w-auto">
              Send invitation
            </Button>
          </div>
        </div>
      </Modal>

      <Drawer
        isOpen={Boolean(selectedMember)}
        onClose={closeMemberDrawer}
        title={selectedMember?.name ?? "Team member"}
      >
        {selectedMember && memberForm ? (
          <div data-testid="team-member-drawer" className="space-y-6">
            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <AvatarCard member={selectedMember} />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <ReadOnlyField label="Email" value={selectedMember.email} />
              <ReadOnlyField
                label="Last active"
                value={formatDateTime(selectedMember.lastActiveAt)}
              />
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <FilterSelect
                label="Role"
                value={memberForm.role}
                onChange={(value) =>
                  setMemberForm((current) =>
                    current
                      ? {
                          ...current,
                          role: value as TeamRole,
                        }
                      : current,
                  )
                }
                options={(filters?.roles ?? []).map((role) => ({
                  label: role,
                  value: role,
                }))}
                allowAll={false}
                disabled={!canManageMembers}
              />
              <FilterSelect
                label="Team"
                value={memberForm.team}
                onChange={(value) =>
                  setMemberForm((current) =>
                    current
                      ? {
                          ...current,
                          team: value,
                        }
                      : current,
                  )
                }
                options={filters?.teams ?? []}
                allowAll={false}
                disabled={!canManageMembers}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <FilterSelect
                label="Account status"
                value={memberForm.accountStatus}
                onChange={(value) =>
                  setMemberForm((current) =>
                    current
                      ? {
                          ...current,
                          accountStatus: value as "active" | "inactive",
                        }
                      : current,
                  )
                }
                options={[
                  { label: "active", value: "active" },
                  { label: "inactive", value: "inactive" },
                ]}
                allowAll={false}
                disabled={!canManageMembers}
              />
              <label className="space-y-2" htmlFor={workloadLimitInputId}>
                <span
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  Workload limit
                </span>
                <Input
                  disabled={!canManageMembers}
                  id={workloadLimitInputId}
                  inputMode="numeric"
                  value={memberForm.workloadLimit}
                  onChange={(event) =>
                    setMemberForm((current) =>
                      current
                        ? {
                            ...current,
                            workloadLimit: event.target.value,
                          }
                        : current,
                    )
                  }
                />
              </label>
            </div>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="grid gap-4 sm:grid-cols-2">
                <StatPill
                  label="Active conversations"
                  value={String(selectedMember.activeConversationCount)}
                />
                <StatPill
                  label="Assigned conversations"
                  value={String(selectedMember.assignedConversationCount)}
                />
              </div>
            </section>

            {canManageMembers ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="sm:w-auto"
                    data-testid="save-team-member-button"
                    loading={isSavingMember}
                    onClick={() => void handleSaveMember()}
                  >
                    Save member
                  </Button>
                  <Button
                    className="sm:w-auto"
                    disabled={selectedMember.accountStatus === "inactive"}
                    onClick={() => setConfirmAction("deactivate")}
                    variant="secondary"
                  >
                    Deactivate member
                  </Button>
                </div>
                <Button
                  className="sm:w-auto"
                  onClick={() => setConfirmAction("remove")}
                  variant="secondary"
                >
                  Remove member
                </Button>
              </div>
            ) : (
              <Alert tone="info">
                Your role can view team details, but only Owners and Admins can save
                changes.
              </Alert>
            )}
          </div>
        ) : null}
      </Drawer>

      <Modal
        isOpen={Boolean(confirmAction && selectedMember)}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === "remove" ? "Remove member" : "Deactivate member"}
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            {confirmAction === "remove"
              ? "This removes the member from the mock workspace. Ownership and self-removal rules are still enforced on the API."
              : "This marks the member inactive in the mock workspace and updates shared assignment labels in Inbox and Customers."}
          </p>
          <div className="flex justify-end gap-3">
            <Button className="w-auto" onClick={() => setConfirmAction(null)} variant="secondary">
              Cancel
            </Button>
            <Button className="w-auto" onClick={() => void handleConfirmedAction()}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={toastMessage} tone={toastTone} />
    </>
  );
}

function AvatarCard({
  compact = false,
  member,
}: {
  compact?: boolean;
  member: TeamMember;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
        {member.avatarFallback}
      </div>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{member.name}</p>
          {member.isCurrentUser ? (
            <span className="rounded-full bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white">
              You
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm text-slate-600 dark:text-slate-400">{member.email}</p>
        <div className="flex flex-wrap gap-2">
          {!compact ? <RoleBadge role={member.role} /> : null}
          <Pill label={member.onlineStatus} tone={onlineStatusClasses[member.onlineStatus]} />
          <Pill label={member.accountStatus} tone={accountStatusClasses[member.accountStatus]} />
        </div>
      </div>
    </div>
  );
}

function Pill({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={classNames("rounded-full px-2 py-1 text-[11px] font-semibold", tone)}>
      {label}
    </span>
  );
}

function RoleBadge({ role }: { role: TeamRole }) {
  return (
    <span
      className={classNames(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        roleBadgeClasses[role],
      )}
    >
      {role}
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      <span className="font-semibold text-slate-950 dark:text-slate-100">{value}</span> {label}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  const id = useId();

  return (
    <label className="space-y-2" htmlFor={id}>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <Input id={id} readOnly value={value} />
    </label>
  );
}

function FilterSelect({
  allowAll = true,
  disabled = false,
  label,
  onChange,
  options,
  value,
}: {
  allowAll?: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const id = useId();

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        aria-label={label}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-500 dark:focus:ring-slate-800 dark:disabled:bg-slate-800"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {allowAll ? <option value="all">All</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
