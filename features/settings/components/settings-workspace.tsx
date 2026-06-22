"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { Toast } from "@/components/ui/toast";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Dropdown } from "@/components/ui/dropdown";
import { classNames } from "@/lib/class-names";
import { ApiError } from "@/lib/http/api-error";
import {
  createSavedReply,
  deleteSavedReply,
  getSavedReplies,
  getSettings,
  updateBusinessHours,
  updateInboxPreferences,
  updateLocale,
  updateNotifications,
  updateSavedReply,
  updateWorkspaceProfile,
} from "../services/settings-service";
import type {
  AppLocale,
  BusinessHoursSettings,
  InboxPreferencesSettings,
  NotificationsSettings,
  SavedReply,
  SavedReplyInput,
  SettingsResponse,
  SettingsSection,
  WorkspaceProfileSettings,
} from "../types/settings";

const sectionDefinitions: Array<{ description: string; id: SettingsSection; label: string }> = [
  {
    description: "Business name, contact details, and preview-only branding.",
    id: "workspace-profile",
    label: "Workspace Profile",
  },
  {
    description: "Coverage windows, holidays, and after-hours message handling.",
    id: "business-hours",
    label: "Business Hours",
  },
  {
    description: "Default ownership, status, and closeout preferences for Inbox.",
    id: "inbox-preferences",
    label: "Inbox Preferences",
  },
  {
    description: "Reusable shortcuts shared with the Inbox composer.",
    id: "saved-replies",
    label: "Saved Replies",
  },
  {
    description: "Alert routing for messages, mentions, publishing, and integrations.",
    id: "notifications",
    label: "Notifications",
  },
  {
    description: "Session visibility and mock security controls.",
    id: "security",
    label: "Security",
  },
];

const sectionTranslationKeys: Record<SettingsSection, "workspace" | "hours" | "inbox" | "replies" | "notifications" | "security"> = {
  "workspace-profile": "workspace",
  "business-hours": "hours",
  "inbox-preferences": "inbox",
  "saved-replies": "replies",
  notifications: "notifications",
  security: "security",
};
const conversationStatuses = ["open", "pending", "resolved"] as const;

type ReplyFormState = SavedReplyInput;

const initialReplyForm: ReplyFormState = {
  category: "General",
  message: "",
  shortcut: "",
  title: "",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isEqual<T>(left: T, right: T) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function holidaysToText(value: string[]) {
  return value.join("\n");
}

function holidaysFromText(value: string) {
  return Array.from(
    new Set(
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  );
}

export function SettingsWorkspace() {
  const locale = useLocale();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const languageOptions: Array<{ label: string; value: AppLocale }> = [
    { label: tCommon("english"), value: "en" },
    { label: tCommon("thai"), value: "th" },
  ];
  const [activeSection, setActiveSection] = useState<SettingsSection>("workspace-profile");
  const [pendingSection, setPendingSection] = useState<SettingsSection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"error" | "success">("success");
  const [isSaving, setIsSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [currentUser, setCurrentUser] = useState<SettingsResponse["currentUser"] | null>(null);
  const [assignmentOptions, setAssignmentOptions] = useState<SettingsResponse["assignmentOptions"]>([]);
  const [security, setSecurity] = useState<SettingsResponse["security"] | null>(null);
  const [savedReplyCategories, setSavedReplyCategories] = useState<string[]>([]);

  const [initialWorkspaceProfile, setInitialWorkspaceProfile] =
    useState<WorkspaceProfileSettings | null>(null);
  const [workspaceProfile, setWorkspaceProfile] = useState<WorkspaceProfileSettings | null>(null);
  const [workspaceLogoPreview, setWorkspaceLogoPreview] = useState<string | null>(null);

  const [initialBusinessHours, setInitialBusinessHours] =
    useState<BusinessHoursSettings | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHoursSettings | null>(null);
  const [holidaysDraft, setHolidaysDraft] = useState("");

  const [initialInboxPreferences, setInitialInboxPreferences] =
    useState<InboxPreferencesSettings | null>(null);
  const [inboxPreferences, setInboxPreferences] = useState<InboxPreferencesSettings | null>(null);

  const [initialNotifications, setInitialNotifications] =
    useState<NotificationsSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationsSettings | null>(null);

  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [savedReplySearch, setSavedReplySearch] = useState("");
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [replyForm, setReplyForm] = useState<ReplyFormState>(initialReplyForm);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [isReplySaving, setIsReplySaving] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<SavedReply | null>(null);
  const [isReplyDeleting, setIsReplyDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSettingsWorkspace() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [settings, replies] = await Promise.all([getSettings(), getSavedReplies()]);

        if (!isMounted) {
          return;
        }

        setCurrentUser(settings.currentUser);
        setAssignmentOptions(settings.assignmentOptions);
        setSecurity(settings.security);
        setSavedReplyCategories(settings.savedReplyCategories);
        setInitialWorkspaceProfile(settings.workspaceProfile);
        setWorkspaceProfile(settings.workspaceProfile);
        setWorkspaceLogoPreview(settings.workspaceProfile.logoPreview);
        setInitialBusinessHours(settings.businessHours);
        setBusinessHours(settings.businessHours);
        setHolidaysDraft(holidaysToText(settings.businessHours.holidays));
        setInitialInboxPreferences(settings.inboxPreferences);
        setInboxPreferences(settings.inboxPreferences);
        setInitialNotifications(settings.notifications);
        setNotifications(settings.notifications);
        setSavedReplies(replies);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          error instanceof ApiError
            ? error.message
            : tCommon("error"),
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSettingsWorkspace();

    return () => {
      isMounted = false;
    };
  }, [tCommon]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const isWorkspaceDirty =
    workspaceProfile !== null &&
    initialWorkspaceProfile !== null &&
    !isEqual(workspaceProfile, initialWorkspaceProfile);
  const isBusinessHoursDirty =
    businessHours !== null &&
    initialBusinessHours !== null &&
    (!isEqual(businessHours, initialBusinessHours) ||
      holidaysDraft !== holidaysToText(initialBusinessHours.holidays));
  const isInboxPreferencesDirty =
    inboxPreferences !== null &&
    initialInboxPreferences !== null &&
    !isEqual(inboxPreferences, initialInboxPreferences);
  const isNotificationsDirty =
    notifications !== null &&
    initialNotifications !== null &&
    !isEqual(notifications, initialNotifications);

  const isCurrentSectionDirty =
    activeSection === "workspace-profile"
      ? isWorkspaceDirty
      : activeSection === "business-hours"
        ? isBusinessHoursDirty
        : activeSection === "inbox-preferences"
          ? isInboxPreferencesDirty
          : activeSection === "notifications"
            ? isNotificationsDirty
            : false;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isCurrentSectionDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isCurrentSectionDirty]);

  const canManageSettings = currentUser?.canManageSettings ?? false;

  const visibleSavedReplies = useMemo(() => {
    const normalizedSearch = savedReplySearch.trim().toLowerCase();

    return savedReplies.filter((reply) => {
      if (!normalizedSearch) {
        return true;
      }

      return (
        reply.title.toLowerCase().includes(normalizedSearch) ||
        reply.shortcut.toLowerCase().includes(normalizedSearch) ||
        reply.category.toLowerCase().includes(normalizedSearch) ||
        reply.message.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [savedReplies, savedReplySearch]);

  const handleSectionChange = (section: SettingsSection) => {
    if (section === activeSection) {
      return;
    }

    if (isCurrentSectionDirty) {
      setPendingSection(section);
      return;
    }

    setActiveSection(section);
  };

  const resetActiveSection = () => {
    if (activeSection === "workspace-profile" && initialWorkspaceProfile) {
      setWorkspaceProfile(initialWorkspaceProfile);
      setWorkspaceLogoPreview(initialWorkspaceProfile.logoPreview);
    }

    if (activeSection === "business-hours" && initialBusinessHours) {
      setBusinessHours(initialBusinessHours);
      setHolidaysDraft(holidaysToText(initialBusinessHours.holidays));
    }

    if (activeSection === "inbox-preferences" && initialInboxPreferences) {
      setInboxPreferences(initialInboxPreferences);
    }

    if (activeSection === "notifications" && initialNotifications) {
      setNotifications(initialNotifications);
    }
  };

  const handleConfirmSectionChange = () => {
    if (!pendingSection) {
      return;
    }

    resetActiveSection();
    setActiveSection(pendingSection);
    setPendingSection(null);
  };

  const handleReset = () => {
    resetActiveSection();
    setShowResetConfirm(false);
    setToastTone("success");
    setToastMessage(t("resetDone"));
  };

  const handleSaveSection = async () => {
    if (!canManageSettings) {
      return;
    }

    setIsSaving(true);

    try {
      if (activeSection === "workspace-profile" && workspaceProfile) {
        const updated = await updateWorkspaceProfile({
          businessName: workspaceProfile.businessName,
          email: workspaceProfile.email,
          language: workspaceProfile.language,
          phone: workspaceProfile.phone,
          timezone: workspaceProfile.timezone,
        });
        setWorkspaceProfile(updated);
        setInitialWorkspaceProfile(updated);
        if (updated.language !== locale) {
          await updateLocale(updated.language);
          window.location.reload();
          return;
        }
      }

      if (activeSection === "business-hours" && businessHours) {
        const updated = await updateBusinessHours({
          holidays: holidaysFromText(holidaysDraft),
          outsideBusinessHoursMessage: businessHours.outsideBusinessHoursMessage,
          workingDays: businessHours.workingDays,
        });
        setBusinessHours(updated);
        setInitialBusinessHours(updated);
        setHolidaysDraft(holidaysToText(updated.holidays));
      }

      if (activeSection === "inbox-preferences" && inboxPreferences) {
        const updated = await updateInboxPreferences(inboxPreferences);
        setInboxPreferences(updated);
        setInitialInboxPreferences(updated);
      }

      if (activeSection === "notifications" && notifications) {
        const updated = await updateNotifications(notifications);
        setNotifications(updated);
        setInitialNotifications(updated);
      }

      setToastTone("success");
      setToastMessage(t("saved"));
    } catch (error) {
      setToastTone("error");
      setToastMessage(
        error instanceof ApiError ? error.message : "Unable to save settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoPreview = (file: File | null) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setWorkspaceLogoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const openReplyDialog = (reply?: SavedReply) => {
    setReplyError(null);
    setEditingReplyId(reply?.id ?? null);
    setReplyForm(
      reply
        ? {
            category: reply.category,
            message: reply.message,
            shortcut: reply.shortcut,
            title: reply.title,
          }
        : initialReplyForm,
    );
    setIsReplyDialogOpen(true);
  };

  const handleSaveReply = async () => {
    setIsReplySaving(true);
    setReplyError(null);

    try {
      const reply = editingReplyId
        ? await updateSavedReply(editingReplyId, replyForm)
        : await createSavedReply(replyForm);

      setSavedReplies((current) => {
        const nextReplies = editingReplyId
          ? current.map((item) => (item.id === reply.id ? reply : item))
          : [reply, ...current];

        return nextReplies.sort((left, right) => left.title.localeCompare(right.title));
      });
      setSavedReplyCategories((current) =>
        Array.from(new Set([...current, reply.category])).sort((left, right) =>
          left.localeCompare(right),
        ),
      );
      setIsReplyDialogOpen(false);
      setReplyForm(initialReplyForm);
      setEditingReplyId(null);
      setToastTone("success");
      setToastMessage(editingReplyId ? "Saved Reply updated" : "Saved Reply created");
    } catch (error) {
      setReplyError(
        error instanceof ApiError ? error.message : "Unable to save Saved Reply.",
      );
    } finally {
      setIsReplySaving(false);
    }
  };

  const handleDeleteReply = async () => {
    if (!replyToDelete) {
      return;
    }

    setIsReplyDeleting(true);

    try {
      await deleteSavedReply(replyToDelete.id);
      setSavedReplies((current) => current.filter((reply) => reply.id !== replyToDelete.id));
      setReplyToDelete(null);
      setToastTone("success");
      setToastMessage("Saved Reply deleted");
    } catch (error) {
      setToastTone("error");
      setToastMessage(
        error instanceof ApiError ? error.message : "Unable to delete Saved Reply.",
      );
    } finally {
      setIsReplyDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <main
        data-testid="settings-page"
        className="flex min-h-[calc(100vh-97px)] items-center justify-center px-4 py-6"
      >
        <div className="flex items-center text-sm text-slate-500">
          <Spinner className="mr-2 text-slate-400" />
          {t("loading")}
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main data-testid="settings-page" className="px-4 py-6 lg:px-6">
        <ErrorState
          actionLabel={tCommon("retry")}
          description={loadError}
          onAction={() => window.location.reload()}
          title={t("title")}
        />
      </main>
    );
  }

  return (
    <>
      <main
        data-testid="settings-page"
        className="flex h-full min-h-[calc(100vh-97px)] flex-col px-4 py-4 lg:px-6 lg:py-6"
      >
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                {t("title")}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t("description")}
              </p>
            </div>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>

            {!canManageSettings && currentUser ? (
              <div className="mt-4">
                <Alert>
                  {t("readOnly")}
                </Alert>
              </div>
            ) : null}

            <nav data-testid="settings-navigation" className="mt-5 space-y-2">
              {sectionDefinitions.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={classNames(
                    "w-full rounded-[1.5rem] border px-4 py-3 text-left transition",
                    activeSection === section.id
                      ? "border-cyan-200 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/30"
                      : "border-slate-200 bg-slate-50 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-950",
                  )}
                  onClick={() => handleSectionChange(section.id)}
                >
                  <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{t(`sections.${sectionTranslationKeys[section.id]}`)}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{section.description}</p>
                </button>
              ))}
            </nav>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            {isCurrentSectionDirty ? (
              <div className="mb-4">
                <Alert tone="info">
                  {t("unsaved")}
                </Alert>
              </div>
            ) : null}

            {activeSection === "workspace-profile" && workspaceProfile ? (
              <SectionFrame
                canManageSettings={canManageSettings}
                description="Keep core business details and preview branding in sync for the operator workspace."
                onReset={() => setShowResetConfirm(true)}
                onSave={() => void handleSaveSection()}
                showActions
                title={t("sections.workspace")}
                isSaving={isSaving}
                isDirty={isWorkspaceDirty}
              >
                <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex h-40 items-center justify-center overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#155e75_100%)] text-4xl font-semibold text-white">
                      {workspaceLogoPreview?.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt="Workspace logo preview"
                          className="h-full w-full object-cover"
                          src={workspaceLogoPreview}
                        />
                      ) : (
                        workspaceLogoPreview
                      )}
                    </div>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Logo selection
                      </span>
                      <input
                        accept="image/*"
                        disabled={!canManageSettings}
                        type="file"
                        onChange={(event) =>
                          handleLogoPreview(event.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Preview only. Logo files are not uploaded in the mock environment.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <LabeledField label={t("businessName")}>
                      <Input
                        value={workspaceProfile.businessName}
                        onChange={(event) =>
                          setWorkspaceProfile((current) =>
                            current
                              ? { ...current, businessName: event.target.value }
                              : current,
                          )
                        }
                        disabled={!canManageSettings}
                      />
                    </LabeledField>
                    <LabeledField label={t("workspaceEmail")}>
                      <Input
                        type="email"
                        value={workspaceProfile.email}
                        onChange={(event) =>
                          setWorkspaceProfile((current) =>
                            current ? { ...current, email: event.target.value } : current,
                          )
                        }
                        disabled={!canManageSettings}
                      />
                    </LabeledField>
                    <LabeledField label={t("phone")}>
                      <Input
                        value={workspaceProfile.phone}
                        onChange={(event) =>
                          setWorkspaceProfile((current) =>
                            current ? { ...current, phone: event.target.value } : current,
                          )
                        }
                        disabled={!canManageSettings}
                      />
                    </LabeledField>
                    <SelectField
                      label={tCommon("language")}
                      value={workspaceProfile.language}
                      options={languageOptions}
                      disabled={!canManageSettings}
                      onChange={(value) =>
                        setWorkspaceProfile((current) =>
                          current ? { ...current, language: value as AppLocale } : current,
                        )
                      }
                    />
                    <LabeledField label={t("timezone")}>
                      <Input
                        value={workspaceProfile.timezone}
                        onChange={(event) =>
                          setWorkspaceProfile((current) =>
                            current ? { ...current, timezone: event.target.value } : current,
                          )
                        }
                        disabled={!canManageSettings}
                      />
                    </LabeledField>
                  </div>
                </div>
              </SectionFrame>
            ) : null}

            {activeSection === "business-hours" && businessHours ? (
              <SectionFrame
                canManageSettings={canManageSettings}
                description="Define support coverage, planned holidays, and the message customers receive after hours."
                onReset={() => setShowResetConfirm(true)}
                onSave={() => void handleSaveSection()}
                showActions
                title={t("sections.hours")}
                isSaving={isSaving}
                isDirty={isBusinessHoursDirty}
              >
                <div className="space-y-5">
                  <div className="space-y-3">
                    {businessHours.workingDays.map((day) => (
                      <div
                        key={day.day}
                        className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)]"
                      >
                        <label className="flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          <input
                            checked={day.enabled}
                            disabled={!canManageSettings}
                            type="checkbox"
                            onChange={(event) =>
                              setBusinessHours((current) =>
                                current
                                  ? {
                                      ...current,
                                      workingDays: current.workingDays.map((item) =>
                                        item.day === day.day
                                          ? { ...item, enabled: event.target.checked }
                                          : item,
                                      ),
                                    }
                                  : current,
                              )
                            }
                          />
                          {day.day}
                        </label>
                        <LabeledField label="Opens">
                          <Input
                            disabled={!canManageSettings || !day.enabled}
                            type="time"
                            value={day.opensAt}
                            onChange={(event) =>
                              setBusinessHours((current) =>
                                current
                                  ? {
                                      ...current,
                                      workingDays: current.workingDays.map((item) =>
                                        item.day === day.day
                                          ? { ...item, opensAt: event.target.value }
                                          : item,
                                      ),
                                    }
                                  : current,
                              )
                            }
                          />
                        </LabeledField>
                        <LabeledField label="Closes">
                          <Input
                            disabled={!canManageSettings || !day.enabled}
                            type="time"
                            value={day.closesAt}
                            onChange={(event) =>
                              setBusinessHours((current) =>
                                current
                                  ? {
                                      ...current,
                                      workingDays: current.workingDays.map((item) =>
                                        item.day === day.day
                                          ? { ...item, closesAt: event.target.value }
                                          : item,
                                      ),
                                    }
                                  : current,
                              )
                            }
                          />
                        </LabeledField>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <TextAreaField
                      label="Holidays"
                      value={holidaysDraft}
                      disabled={!canManageSettings}
                      placeholder="2026-12-05"
                      helpText="One date per line in YYYY-MM-DD format."
                      onChange={setHolidaysDraft}
                    />
                    <TextAreaField
                      label="Outside-business-hours message"
                      value={businessHours.outsideBusinessHoursMessage}
                      disabled={!canManageSettings}
                      placeholder="Thanks for reaching out..."
                      onChange={(value) =>
                        setBusinessHours((current) =>
                          current
                            ? { ...current, outsideBusinessHoursMessage: value }
                            : current,
                        )
                      }
                    />
                  </div>
                </div>
              </SectionFrame>
            ) : null}

            {activeSection === "inbox-preferences" && inboxPreferences ? (
              <SectionFrame
                canManageSettings={canManageSettings}
                description="Set default ownership and lifecycle behavior for new conversations."
                onReset={() => setShowResetConfirm(true)}
                onSave={() => void handleSaveSection()}
                showActions
                title={t("sections.inbox")}
                isSaving={isSaving}
                isDirty={isInboxPreferencesDirty}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label={t("defaultAssignment")}
                    value={inboxPreferences.defaultAssignment}
                    options={assignmentOptions}
                    disabled={!canManageSettings}
                    onChange={(value) =>
                      setInboxPreferences((current) =>
                        current ? { ...current, defaultAssignment: value } : current,
                      )
                    }
                  />
                  <SelectField
                    label={t("defaultStatus")}
                    value={inboxPreferences.defaultConversationStatus}
                    options={conversationStatuses.map((status) => ({
                      label: status,
                      value: status,
                    }))}
                    disabled={!canManageSettings}
                    onChange={(value) =>
                      setInboxPreferences((current) =>
                        current
                          ? {
                              ...current,
                              defaultConversationStatus:
                                value as InboxPreferencesSettings["defaultConversationStatus"],
                            }
                          : current,
                      )
                    }
                  />
                  <LabeledField label={t("autoClose")}>
                    <Input
                      inputMode="numeric"
                      value={String(inboxPreferences.autoCloseHours)}
                      onChange={(event) =>
                        setInboxPreferences((current) =>
                          current
                            ? {
                                ...current,
                                autoCloseHours: Number(event.target.value || "0"),
                              }
                            : current,
                        )
                      }
                      disabled={!canManageSettings}
                    />
                  </LabeledField>
                  <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <ToggleField
                      checked={inboxPreferences.soundEnabled}
                      disabled={!canManageSettings}
                      label={t("sound")}
                      onChange={(checked) =>
                        setInboxPreferences((current) =>
                          current ? { ...current, soundEnabled: checked } : current,
                        )
                      }
                    />
                    <ToggleField
                      checked={inboxPreferences.showMessagePreview}
                      disabled={!canManageSettings}
                      label={t("messagePreview")}
                      onChange={(checked) =>
                        setInboxPreferences((current) =>
                          current ? { ...current, showMessagePreview: checked } : current,
                        )
                      }
                    />
                  </div>
                </div>
              </SectionFrame>
            ) : null}

            {activeSection === "saved-replies" ? (
              <SectionFrame
                canManageSettings={canManageSettings}
                description="Manage reusable replies that appear in both Settings and the Inbox composer."
                title={t("sections.replies")}
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      placeholder="Search by title, shortcut, category, or message"
                      value={savedReplySearch}
                      onChange={(event) => setSavedReplySearch(event.target.value)}
                    />
                    <Button
                      data-testid="add-saved-reply-button"
                      className="w-auto"
                      disabled={!canManageSettings}
                      onClick={() => openReplyDialog()}
                    >
                      Add Saved Reply
                    </Button>
                  </div>

                  {visibleSavedReplies.length === 0 ? (
                    <EmptyState
                      description="Create a Saved Reply to reuse common responses in the Inbox composer."
                      title="No Saved Replies found"
                    />
                  ) : (
                    <div data-testid="saved-reply-list" className="space-y-3">
                      {visibleSavedReplies.map((reply) => (
                        <div
                          key={reply.id}
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                                  {reply.title}
                                </p>
                                <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
                                  {reply.shortcut}
                                </span>
                                <span className="rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-semibold text-cyan-800">
                                  {reply.category}
                                </span>
                              </div>
                              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{reply.message}</p>
                              <p className="text-xs text-slate-500">
                                Updated {formatDateTime(reply.updatedAt)}
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <Button
                                className="w-auto"
                                onClick={() => openReplyDialog(reply)}
                                variant="secondary"
                              >
                                {canManageSettings ? "Edit" : "View"}
                              </Button>
                              {canManageSettings ? (
                                <Button
                                  className="w-auto"
                                  onClick={() => setReplyToDelete(reply)}
                                  variant="secondary"
                                >
                                  Delete
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionFrame>
            ) : null}

            {activeSection === "notifications" && notifications ? (
              <SectionFrame
                canManageSettings={canManageSettings}
                description="Choose which operational alerts should surface in the workspace and mock email delivery."
                onReset={() => setShowResetConfirm(true)}
                onSave={() => void handleSaveSection()}
                showActions
                title={t("sections.notifications")}
                isSaving={isSaving}
                isDirty={isNotificationsDirty}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleField
                    checked={notifications.newMessage}
                    disabled={!canManageSettings}
                    label={t("newMessage")}
                    onChange={(checked) =>
                      setNotifications((current) =>
                        current ? { ...current, newMessage: checked } : current,
                      )
                    }
                  />
                  <ToggleField
                    checked={notifications.assignment}
                    disabled={!canManageSettings}
                    label={t("assignment")}
                    onChange={(checked) =>
                      setNotifications((current) =>
                        current ? { ...current, assignment: checked } : current,
                      )
                    }
                  />
                  <ToggleField
                    checked={notifications.mention}
                    disabled={!canManageSettings}
                    label={t("mention")}
                    onChange={(checked) =>
                      setNotifications((current) =>
                        current ? { ...current, mention: checked } : current,
                      )
                    }
                  />
                  <ToggleField
                    checked={notifications.failedPublishing}
                    disabled={!canManageSettings}
                    label={t("failedPublishing")}
                    onChange={(checked) =>
                      setNotifications((current) =>
                        current ? { ...current, failedPublishing: checked } : current,
                      )
                    }
                  />
                  <ToggleField
                    checked={notifications.expiredConnection}
                    disabled={!canManageSettings}
                    label={t("expiredConnection")}
                    onChange={(checked) =>
                      setNotifications((current) =>
                        current ? { ...current, expiredConnection: checked } : current,
                      )
                    }
                  />
                  <ToggleField
                    checked={notifications.desktop}
                    disabled={!canManageSettings}
                    label={t("desktop")}
                    onChange={(checked) =>
                      setNotifications((current) =>
                        current ? { ...current, desktop: checked } : current,
                      )
                    }
                  />
                  <ToggleField
                    checked={notifications.email}
                    disabled={!canManageSettings}
                    label={t("emailNotifications")}
                    onChange={(checked) =>
                      setNotifications((current) =>
                        current ? { ...current, email: checked } : current,
                      )
                    }
                  />
                  <ToggleField
                    checked={notifications.sound}
                    disabled={!canManageSettings}
                    label={t("sound")}
                    onChange={(checked) =>
                      setNotifications((current) =>
                        current ? { ...current, sound: checked } : current,
                      )
                    }
                  />
                </div>
              </SectionFrame>
            ) : null}

            {activeSection === "security" && security ? (
              <SectionFrame
                canManageSettings={canManageSettings}
                description="Review mock session details without exposing credentials, tokens, or real security controls."
                title={t("sections.security")}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <ReadOnlyCard label={t("accountEmail")} value={security.accountEmail} />
                  <ReadOnlyCard label="Role" value={security.role} />
                  <ReadOnlyCard
                    label={t("currentSession")}
                    value={security.currentSessionId}
                  />
                  <ReadOnlyCard
                    label="Session issued at"
                    value={formatDateTime(security.sessionIssuedAt)}
                  />
                </div>
                <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                    Two-factor authentication
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Coming soon</p>
                  <Button className="mt-4 w-auto" disabled variant="secondary">
                    Two-factor authentication - Coming soon
                  </Button>
                </div>
              </SectionFrame>
            ) : null}
          </section>
        </div>
      </main>

      <Modal
        isOpen={Boolean(pendingSection)}
        onClose={() => setPendingSection(null)}
        title={t("unsavedTitle")}
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            Leaving this section now will discard any unsaved changes.
          </p>
          <div className="flex justify-end gap-3">
            <Button className="w-auto" onClick={() => setPendingSection(null)} variant="secondary">
              Stay here
            </Button>
            <Button className="w-auto" onClick={handleConfirmSectionChange}>
              Discard changes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset changes?"
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            This resets the current section back to the last saved mock state.
          </p>
          <div className="flex justify-end gap-3">
            <Button className="w-auto" onClick={() => setShowResetConfirm(false)} variant="secondary">
              Cancel
            </Button>
            <Button className="w-auto" data-testid="reset-settings-button" onClick={handleReset}>
              Reset section
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isReplyDialogOpen}
        onClose={() => setIsReplyDialogOpen(false)}
        title={editingReplyId ? tCommon("edit") : t("addReply")}
      >
        <div data-testid="saved-reply-dialog" className="space-y-5">
          {replyError ? <Alert tone="error">{replyError}</Alert> : null}
          <LabeledField label={t("replyTitle")}>
            <Input
              disabled={!canManageSettings}
              value={replyForm.title}
              onChange={(event) =>
                setReplyForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </LabeledField>
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledField label={t("category")}>
              <Input
                disabled={!canManageSettings}
                list="saved-reply-categories"
                value={replyForm.category}
                onChange={(event) =>
                  setReplyForm((current) => ({ ...current, category: event.target.value }))
                }
              />
              <datalist id="saved-reply-categories">
                {savedReplyCategories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </LabeledField>
            <LabeledField label={t("shortcut")}>
              <Input
                disabled={!canManageSettings}
                value={replyForm.shortcut}
                onChange={(event) =>
                  setReplyForm((current) => ({ ...current, shortcut: event.target.value }))
                }
              />
            </LabeledField>
          </div>
          <TextAreaField
            label={t("message")}
            value={replyForm.message}
            disabled={!canManageSettings}
            onChange={(value) =>
              setReplyForm((current) => ({ ...current, message: value }))
            }
          />
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Preview
            </p>
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{replyForm.message || "No preview yet."}</p>
          </div>
          {canManageSettings ? (
            <div className="flex justify-end">
              <Button className="w-auto" loading={isReplySaving} onClick={() => void handleSaveReply()}>
                {editingReplyId ? t("saveReply") : t("createReply")}
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(replyToDelete)}
        onClose={() => setReplyToDelete(null)}
        title={tCommon("delete")}
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            Delete {replyToDelete?.title} from the mock workspace and Inbox composer?
          </p>
          <div className="flex justify-end gap-3">
            <Button className="w-auto" onClick={() => setReplyToDelete(null)} variant="secondary">
              {tCommon("cancel")}
            </Button>
            <Button className="w-auto" loading={isReplyDeleting} onClick={() => void handleDeleteReply()}>
              {tCommon("delete")}
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={toastMessage} tone={toastTone} />
    </>
  );
}

function SectionFrame({
  canManageSettings,
  children,
  description,
  isDirty = false,
  isSaving = false,
  onReset,
  onSave,
  showActions = false,
  title,
}: {
  canManageSettings: boolean;
  children: React.ReactNode;
  description: string;
  isDirty?: boolean;
  isSaving?: boolean;
  onReset?: () => void;
  onSave?: () => void;
  showActions?: boolean;
  title: string;
}) {
  const t = useTranslations("common");
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{title}</h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
        {showActions && canManageSettings ? (
          <div className="flex gap-3">
            <Button
              className="w-auto"
              data-testid="reset-settings-button"
              disabled={!isDirty}
              onClick={onReset}
              variant="secondary"
            >
              {t("reset")}
            </Button>
            <Button
              className="w-auto"
              data-testid="save-settings-button"
              disabled={!isDirty}
              loading={isSaving}
              onClick={onSave}
            >
              {t("save")}
            </Button>
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function LabeledField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectField({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const id = useId();

  return (
    <div className="space-y-2">
      <label
        className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
        htmlFor={id}
      >
        {label}
      </label>
      <Dropdown
        id={id}
        ariaLabel={label}
        disabled={disabled}
        value={value}
        onChange={onChange}
        options={options}
      />
    </div>
  );
}

function TextAreaField({
  disabled = false,
  helpText,
  label,
  onChange,
  placeholder,
  value,
}: {
  disabled?: boolean;
  helpText?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const id = useId();

  return (
    <div className="space-y-2">
      <label
        className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
        htmlFor={id}
      >
        {label}
      </label>
      <textarea
        id={id}
        className="min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-500 dark:focus:ring-slate-800 dark:disabled:bg-slate-800"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {helpText ? <p className="text-xs text-slate-500 dark:text-slate-400">{helpText}</p> : null}
    </div>
  );
}

function ToggleField({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <label
      className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
      htmlFor={id}
    >
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</span>
      <input
        id={id}
        checked={checked}
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function ReadOnlyCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-all text-sm text-slate-700 dark:text-slate-300">{value}</p>
    </div>
  );
}
