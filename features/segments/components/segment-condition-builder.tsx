/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useRef, useId } from "react";
import { DraftSegmentCondition } from "../types/segments";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { TagPicker } from "@/features/tags";
import { apiClient } from "@/lib/http/api-client";
import { classNames } from "@/lib/class-names";

/* --- MultiSelect Component --- */
function MultiSelect({
  ariaLabel,
  options,
  values,
  onChange,
  placeholder,
}: {
  ariaLabel: string;
  options: { label: string; value: string }[];
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isOpen]);

  const toggleValue = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const selectedLabels = options
    .filter((o) => values.includes(o.value))
    .map((o) => o.label)
    .join(", ");

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:focus-visible:border-cyan-500"
        onClick={() => setIsOpen((c) => !c)}
      >
        <span className={classNames("truncate", !selectedLabels && "text-slate-400")}>
          {selectedLabels || placeholder}
        </span>
        <span aria-hidden="true" className={classNames("text-xs transition", isOpen && "rotate-180")}>
          ▼
        </span>
      </button>

      {isOpen ? (
        <div className="absolute z-50 mt-2 max-h-64 w-full min-w-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-950">
          {options.map((option) => {
            const isSelected = values.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleValue(option.value)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:checked:bg-slate-100"
                />
                <span className="truncate">{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

interface SegmentConditionBuilderProps {
  conditions: DraftSegmentCondition[];
  onChange: (conditions: DraftSegmentCondition[]) => void;
}

export function SegmentConditionBuilder({ conditions, onChange }: SegmentConditionBuilderProps) {
  const t = useTranslations("segments");
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    apiClient.get("/api/team/members?pageSize=100&accountStatus=active").then((res) => {
      const members = res.data.members || [];
      setAgents(members.map((m: any) => ({ id: m.id, name: m.name || m.email })));
    }).catch(() => {});
  }, []);

  const handleAddCondition = () => {
    onChange([...conditions, { type: "select_condition" }]);
  };

  const handleRemoveCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, newCondition: DraftSegmentCondition) => {
    const updated = [...conditions];
    updated[index] = newCondition;
    onChange(updated);
  };

  const getConditionOptions = () => [
    { label: t("condSelect"), value: "select_condition" },
    { label: t("condCustomerLabels"), value: "customer_labels", group: t("groupCustomerData") },
    { label: t("condCustomerCreatedDate"), value: "customer_created_date", group: t("groupCustomerData") },
    { label: t("condChannel"), value: "channel", group: t("groupEngagement") },
    { label: t("condAssignedAgent"), value: "assigned_agent", group: t("groupEngagement") },
    { label: t("condLatestConversationStatus"), value: "latest_conversation_status", group: t("groupEngagement") },
    { label: t("condLastInteraction"), value: "last_interaction", group: t("groupEngagement") },
    { label: t("condUnreadMessages"), value: "unread_messages", group: t("groupEngagement") },
    { label: t("condTotalOrders"), value: "total_orders", group: t("groupOrders") },
    { label: t("condTotalSpend"), value: "total_spend", group: t("groupOrders") },
    { label: t("condAverageOrderValue"), value: "average_order_value", group: t("groupOrders") },
    { label: t("condLastPurchase"), value: "last_purchase", group: t("groupOrders") },
    { label: t("condMarketingConsent"), value: "marketing_consent", group: t("groupConsent") },
  ];

  const getDefaultCondition = (type: string): DraftSegmentCondition => {
    switch (type) {
      case "customer_labels": return { type, operator: "includes_any", value: [] };
      case "channel": return { type, operator: "has_any", value: [] };
      case "assigned_agent": return { type, operator: "is", value: [] };
      case "latest_conversation_status": return { type, operator: "is", value: [] };
      case "last_interaction": return { type, operator: "days_ago_lt", value: 0 };
      case "unread_messages": return { type, operator: "gt", value: 0 };
      case "marketing_consent": return { type, operator: "is", value: [] };
      case "total_orders": return { type, operator: "gt", value: 0 };
      case "total_spend": return { type, operator: "gt", value: 0 };
      case "average_order_value": return { type, operator: "gt", value: 0 };
      case "last_purchase": return { type, operator: "days_ago_lt", value: 0 };
      case "customer_created_date": return { type, operator: "days_ago_lt", value: 0 };
      default: return { type: "select_condition" };
    }
  };

  const getOperators = (type: string) => {
    switch (type) {
      case "customer_labels": return [
        { label: t("opIncludesAny"), value: "includes_any" },
        { label: t("opIncludesAll"), value: "includes_all" },
        { label: t("opExcludesAny"), value: "excludes_any" },
        { label: t("opExcludesAll"), value: "excludes_all" }
      ];
      case "channel": return [
        { label: t("opHasAny"), value: "has_any" },
        { label: t("opHasAll"), value: "has_all" },
        { label: t("opDoesNotHave"), value: "does_not_have" }
      ];
      case "assigned_agent": return [
        { label: t("opIs"), value: "is" },
        { label: t("opIsNot"), value: "is_not" },
        { label: t("opIsUnassigned"), value: "is_unassigned" }
      ];
      case "latest_conversation_status": return [
        { label: t("opIs"), value: "is" },
        { label: t("opIsNot"), value: "is_not" }
      ];
      case "last_interaction":
      case "last_purchase": return [
        { label: t("opDaysAgoLt"), value: "days_ago_lt" },
        { label: t("opDaysAgoGt"), value: "days_ago_gt" },
        { label: t("opBeforeDate"), value: "before_date" },
        { label: t("opAfterDate"), value: "after_date" },
        { label: t("opNever"), value: "never" }
      ];
      case "unread_messages": return [
        { label: t("opGt"), value: "gt" },
        { label: t("opEq"), value: "eq" },
        { label: t("opHasNoUnread"), value: "has_no_unread" }
      ];
      case "marketing_consent": return [
        { label: t("opIs"), value: "is" }
      ];
      case "total_orders":
      case "total_spend":
      case "average_order_value": return [
        { label: t("opGt"), value: "gt" },
        { label: t("opGte"), value: "gte" },
        { label: t("opEq"), value: "eq" },
        { label: t("opLt"), value: "lt" },
        { label: t("opLte"), value: "lte" },
        { label: t("opBetween"), value: "between" }
      ];
      case "customer_created_date": return [
        { label: t("opDaysAgoLt"), value: "days_ago_lt" },
        { label: t("opBeforeDate"), value: "before_date" },
        { label: t("opAfterDate"), value: "after_date" },
        { label: t("opBetweenDates"), value: "between_dates" }
      ];
      default: return [];
    }
  };

  const channelOptions = [
    { label: "LINE", value: "LINE" },
    { label: "Facebook", value: "FACEBOOK" },
    { label: "Instagram", value: "INSTAGRAM" },
    { label: "Telegram", value: "TELEGRAM" },
    { label: "X", value: "X" },
    { label: "TikTok", value: "TIKTOK" },
    { label: "Shopee", value: "SHOPEE" },
    { label: "Lazada", value: "LAZADA" },
    { label: "TikTok Shop", value: "TIKTOK_SHOP" },
  ];

  const conversationStatusOptions = [
    { label: t("statusOpen"), value: "open" },
    { label: t("statusPending"), value: "pending" },
    { label: t("statusResolved"), value: "resolved" },
  ];

  const consentOptions = [
    { label: t("consentOptedIn"), value: "opted_in" },
    { label: t("consentOptedOut"), value: "opted_out" },
    { label: t("consentUnknown"), value: "unknown" },
  ];

  return (
    <div className="space-y-4">
      {conditions.map((condition, index) => {
        const typeOptions = getConditionOptions();
        const operators = getOperators(condition.type);
        const requiresNoValue = ["is_unassigned", "never", "has_no_unread"].includes((condition as any).operator);
        const isBetween = ["between", "between_dates"].includes((condition as any).operator);
        const isDateType = ["before_date", "after_date", "between_dates"].includes((condition as any).operator);

        return (
          <div key={index} className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-full sm:w-56 lg:w-64 shrink-0">
                <Dropdown
                  ariaLabel="Condition Type"
                  options={typeOptions}
                  value={condition.type}
                  onChange={(val) => handleConditionChange(index, getDefaultCondition(val))}
                />
              </div>

              {condition.type !== "select_condition" && (
                <div className="flex-1 flex flex-wrap sm:flex-nowrap gap-3">
                  <div className="w-full sm:w-48 lg:w-56 shrink-0">
                    <Dropdown
                      ariaLabel="Operator"
                      options={operators}
                      value={(condition as any).operator}
                      onChange={(op) => {
                        const newCond: any = { type: condition.type, operator: op };
                        if (!["is_unassigned", "never", "has_no_unread"].includes(op)) {
                          if (["between", "between_dates"].includes(op)) {
                            newCond.value = ["before_date", "after_date", "between_dates"].includes(op) ? ["", ""] : [0, 0];
                          } else if (["before_date", "after_date"].includes(op)) {
                            newCond.value = "";
                          } else if (["gt", "gte", "eq", "lt", "lte", "days_ago_lt", "days_ago_gt"].includes(op)) {
                            newCond.value = 0;
                          } else {
                            newCond.value = [];
                          }
                        }
                        handleConditionChange(index, newCond as DraftSegmentCondition);
                      }}
                    />
                  </div>

                  {!requiresNoValue && (
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {condition.type === "customer_labels" ? (
                        <div className="w-full">
                          <TagPicker
                            mode="select"
                            target="CUSTOMER"
                            selectedTagIds={Array.isArray((condition as any).value) ? (condition as any).value : []}
                            onChange={(tagIds) => handleConditionChange(index, { ...condition, value: tagIds } as any)}
                          />
                        </div>
                      ) : condition.type === "channel" ? (
                        <div className="w-full">
                          <MultiSelect
                            ariaLabel="Select Channels"
                            placeholder={t("phSelectChannels")}
                            options={channelOptions}
                            values={Array.isArray((condition as any).value) ? (condition as any).value : []}
                            onChange={(vals) => handleConditionChange(index, { ...condition, value: vals } as any)}
                          />
                        </div>
                      ) : condition.type === "assigned_agent" ? (
                        <div className="w-full">
                          <MultiSelect
                            ariaLabel="Select Agents"
                            placeholder={t("phSelectAgents")}
                            options={agents.map(a => ({ label: a.name, value: a.id }))}
                            values={Array.isArray((condition as any).value) ? (condition as any).value : []}
                            onChange={(vals) => handleConditionChange(index, { ...condition, value: vals } as any)}
                          />
                        </div>
                      ) : condition.type === "latest_conversation_status" ? (
                        <div className="w-full">
                          <MultiSelect
                            ariaLabel="Select Statuses"
                            placeholder={t("phSelectStatuses")}
                            options={conversationStatusOptions}
                            values={Array.isArray((condition as any).value) ? (condition as any).value : []}
                            onChange={(vals) => handleConditionChange(index, { ...condition, value: vals } as any)}
                          />
                        </div>
                      ) : condition.type === "marketing_consent" ? (
                        <div className="w-full">
                          <MultiSelect
                            ariaLabel="Select Consents"
                            placeholder={t("phSelectConsents")}
                            options={consentOptions}
                            values={Array.isArray((condition as any).value) ? (condition as any).value : []}
                            onChange={(vals) => handleConditionChange(index, { ...condition, value: vals } as any)}
                          />
                        </div>
                      ) : isDateType ? (
                        isBetween ? (
                          <div className="flex w-full items-center gap-2">
                            <DatePicker
                              ariaLabel="Start Date"
                              placeholder={t("phStartDate")}
                              value={(condition as any).value[0]?.split("T")[0] || ""}
                              onChange={(d) => handleConditionChange(index, { ...condition, value: [d ? `${d}T00:00:00Z` : "", (condition as any).value[1]] } as any)}
                            />
                            <span className="text-slate-500">-</span>
                            <DatePicker
                              ariaLabel="End Date"
                              placeholder={t("phEndDate")}
                              value={(condition as any).value[1]?.split("T")[0] || ""}
                              onChange={(d) => handleConditionChange(index, { ...condition, value: [(condition as any).value[0], d ? `${d}T23:59:59Z` : ""] } as any)}
                            />
                          </div>
                        ) : (
                          <div className="w-full sm:w-48 shrink-0">
                            <DatePicker
                              ariaLabel="Date"
                              placeholder={t("phSelectDate")}
                              value={(condition as any).value?.split("T")[0] || ""}
                              onChange={(d) => {
                                const suffix = (condition as any).operator === "before_date" ? "T00:00:00Z" : "T23:59:59Z";
                                handleConditionChange(index, { ...condition, value: d ? `${d}${suffix}` : "" } as any);
                              }}
                            />
                          </div>
                        )
                      ) : (
                        isBetween ? (
                          <div className="flex w-full sm:w-48 shrink-0 items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={(condition as any).value[0] ?? 0}
                              onChange={(e) => handleConditionChange(index, { ...condition, value: [Number(e.target.value), (condition as any).value[1]] } as any)}
                            />
                            <span className="text-slate-500">-</span>
                            <Input
                              type="number"
                              min="0"
                              value={(condition as any).value[1] ?? 0}
                              onChange={(e) => handleConditionChange(index, { ...condition, value: [(condition as any).value[0], Number(e.target.value)] } as any)}
                            />
                          </div>
                        ) : (
                          <div className="w-full sm:w-40 shrink-0">
                            <Input
                              type="number"
                              min="0"
                              value={(condition as any).value ?? 0}
                              onChange={(e) => handleConditionChange(index, { ...condition, value: Number(e.target.value) } as any)}
                            />
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="shrink-0 flex items-center justify-end">
                <button
                  type="button"
                  aria-label="Remove condition"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  onClick={() => handleRemoveCondition(index)}
                >
                  <Trash className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Helper Text Area (kept below for layout as previously fixed) */}
            {condition.type === "customer_labels" && (condition as any).operator === "includes_any" && <p className="text-xs text-slate-500">{t("helperIncludesAny")}</p>}
            {condition.type === "customer_labels" && (condition as any).operator === "includes_all" && <p className="text-xs text-slate-500">{t("helperIncludesAll")}</p>}
            {condition.type === "customer_labels" && (condition as any).operator === "excludes_any" && <p className="text-xs text-slate-500">{t("helperExcludesAny")}</p>}
            {condition.type === "customer_labels" && (condition as any).operator === "excludes_all" && <p className="text-xs text-slate-500">{t("helperExcludesAll")}</p>}
          </div>
        );
      })}

      <Button
        variant="secondary"
        onClick={handleAddCondition}
        className="w-full justify-center border-dashed dark:border-slate-700"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("addCondition")}
      </Button>
    </div>
  );
}
