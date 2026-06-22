"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { classNames } from "@/lib/class-names";
import type { CustomerDetail } from "../types/customers";
import { useFormatter, useTranslations } from "next-intl";

const channelClasses = {
  Facebook: "bg-blue-100 text-blue-700",
  Instagram: "bg-pink-100 text-pink-700",
  LINE: "bg-emerald-100 text-emerald-700",
  Telegram: "bg-sky-100 text-sky-700",
};

type CustomerDrawerProps = {
  availableTags: string[];
  customer: CustomerDetail | null;
  isOpen: boolean;
  isSaving: boolean;
  noteDraft: string;
  onClose: () => void;
  onNoteDraftChange: (value: string) => void;
  onOpenConversation: () => void;
  onSave: () => void;
  onToggleTag: (tag: string) => void;
};

export function CustomerDrawer({
  availableTags,
  customer,
  isOpen,
  isSaving,
  noteDraft,
  onClose,
  onNoteDraftChange,
  onOpenConversation,
  onSave,
  onToggleTag,
}: CustomerDrawerProps) {
  const format = useFormatter();
  const t = useTranslations("customers");
  const formatDateTime = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={customer?.name ?? t("title")}>
      {customer ? (
        <div data-testid="customer-drawer" className="space-y-6">
          <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-4">
              {customer.avatarImageUrl ? (
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
                  <Image
                    alt={customer.name}
                    className="object-cover"
                    fill
                    sizes="56px"
                    src={customer.avatarImageUrl}
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                  {customer.avatarFallback}
                </div>
              )}
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-100">{customer.name}</h3>
                  <StatusBadge tone={customer.status}>{customer.status}</StatusBadge>
                  {customer.unreadCount > 0 ? (
                    <span className="rounded-full bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white">
                      {t("unread", { count: customer.unreadCount })}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{customer.location}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("lastInteraction", { date: formatDateTime(customer.lastInteractionAt) })}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <DetailCard label={t("contact")} value={customer.email} />
            <DetailCard label={t("contact")} value={customer.phone} />
            <DetailCard label={t("agent")} value={customer.assignedAgent} />
            <DetailCard label={t("notes")} value={customer.notes} />
          </section>

          <section className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t("channels")}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Channel identities shared with the Inbox profile.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {customer.connectedChannels.map((channel) => (
                <div
                  key={`${channel.channel}-${channel.externalId}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <span
                    className={classNames(
                      "inline-flex rounded-full px-2 py-1 text-[11px] font-semibold",
                      channelClasses[channel.channel],
                    )}
                  >
                    {channel.channel}
                  </span>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {channel.handle}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{channel.externalId}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t("tag")}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Toggle the tags you want to keep on this customer.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isActive = customer.tags.includes(tag);

                return (
                  <button
                    key={tag}
                    type="button"
                    className={classNames(
                      "rounded-full border px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-slate-950"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                    )}
                    onClick={() => onToggleTag(tag)}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t("notes")}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Save a new note and it will become the current customer summary.
              </p>
            </div>
            <textarea
              data-testid="customer-notes-field"
              className="min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-500 dark:focus:ring-slate-800"
              placeholder={t("notesPlaceholder")}
              value={noteDraft}
              onChange={(event) => onNoteDraftChange(event.target.value)}
            />
            <div className="space-y-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent notes</h4>
              <div className="space-y-3">
                {customer.noteEntries.slice(0, 4).map((note) => (
                  <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{note.authorName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(note.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{note.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t("recent")}
              </h3>
            </div>
            <div className="space-y-3">
              {customer.recentActivity.map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={classNames(
                          "rounded-full px-2 py-1 text-[11px] font-semibold",
                          channelClasses[activity.channel],
                        )}
                      >
                        {activity.channel}
                      </span>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {activity.senderName}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(activity.createdAt)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{activity.body}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              data-testid="open-conversation-button"
              disabled={!customer.primaryConversationId}
              onClick={onOpenConversation}
              variant="secondary"
            >
              {t("openConversation")}
            </Button>
            <Button
              data-testid="save-customer-button"
              loading={isSaving}
              onClick={onSave}
            >
              {t("save")}
            </Button>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <Input className="mt-3" readOnly value={value} />
    </div>
  );
}
