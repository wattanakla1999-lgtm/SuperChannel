"use client";

import { useTranslations } from "next-intl";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SegmentCondition } from "../types/segments";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { TagPicker } from "@/features/tags";

interface SegmentConditionBuilderProps {
  conditions: SegmentCondition[];
  onChange: (conditions: SegmentCondition[]) => void;
}

export function SegmentConditionBuilder({ conditions, onChange }: SegmentConditionBuilderProps) {
  const t = useTranslations("segments");

  const handleAddCondition = () => {
    onChange([
      ...conditions,
      { type: "total_orders", operator: "gt", value: 0 } as SegmentCondition
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, newCondition: SegmentCondition) => {
    const updated = [...conditions];
    updated[index] = newCondition;
    onChange(updated);
  };

  const conditionTypeOptions = [
    { label: "Total Orders", value: "total_orders" },
    { label: "Total Spend", value: "total_spend" },
    { label: "Customer Labels", value: "customer_labels" },
    { label: "Channel", value: "channel" },
    { label: "Assigned Agent", value: "assigned_agent" },
    { label: "Marketing Consent", value: "marketing_consent" },
    { label: "Last Purchase", value: "last_purchase" },
    { label: "Last Conversation", value: "last_conversation" },
  ];

  return (
    <div className="space-y-4">
      {conditions.map((condition, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-start sm:items-center gap-3">
          <div className="w-56 lg:w-64">
            <Dropdown
              ariaLabel="Condition Type"
              options={conditionTypeOptions}
              value={condition.type}
              onChange={(val) => handleConditionChange(index, { type: val, operator: val === "customer_labels" ? "includes_any" : (val === "total_orders" || val === "total_spend" ? "gt" : val.startsWith("last_") ? "days_ago_lt" : "in"), value: val === "total_orders" || val === "total_spend" || val.startsWith("last_") ? 0 : [] } as unknown as SegmentCondition)}
            />
          </div>

          <div className="flex-1 flex flex-wrap sm:flex-nowrap gap-3">
            {condition.type === "total_orders" || condition.type === "total_spend" ? (
              <>
                <div className="w-full sm:w-40 lg:w-48 shrink-0">
                  <Dropdown
                    ariaLabel="Operator"
                    options={[
                      { label: "Greater than", value: "gt" },
                      { label: "Less than", value: "lt" },
                      { label: "Equals", value: "eq" },
                    ]}
                    value={condition.operator}
                    onChange={(op) => handleConditionChange(index, { ...condition, operator: op } as any)}
                  />
                </div>
                <div className="w-full sm:w-40 shrink-0">
                  <Input
                    type="number"
                    min="0"
                    value={condition.value as number}
                    onChange={(e) => handleConditionChange(index, { ...condition, value: Number(e.target.value) } as any)}
                  />
                </div>
              </>
            ) : condition.type === "last_purchase" || condition.type === "last_conversation" ? (
              <>
                <div className="w-full sm:w-56 lg:w-64 shrink-0">
                  <Dropdown
                    ariaLabel="Operator"
                    options={[
                      { label: "Less than X days ago", value: "days_ago_lt" },
                      { label: "More than X days ago", value: "days_ago_gt" },
                    ]}
                    value={condition.operator}
                    onChange={(op) => handleConditionChange(index, { ...condition, operator: op } as any)}
                  />
                </div>
                <div className="w-full sm:w-40 shrink-0">
                  <Input
                    type="number"
                    min="0"
                    value={condition.value as number}
                    onChange={(e) => handleConditionChange(index, { ...condition, value: Number(e.target.value) } as any)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="w-full sm:w-48 lg:w-56 shrink-0">
                  <Dropdown
                    ariaLabel="Operator"
                    options={[
                      { label: "In", value: "in" },
                      { label: "Not In", value: "not_in" },
                      { label: t("opIncludesAny") || "Includes Any", value: "includes_any" },
                      { label: t("opIncludesAll") || "Includes All", value: "includes_all" },
                      { label: t("opExcludesAny") || "Excludes Any", value: "excludes_any" },
                      { label: t("opExcludesAll") || "Excludes All", value: "excludes_all" },
                      { label: "Is", value: "is" },
                      { label: "Is Not", value: "is_not" },
                    ].filter(op => {
                      if (condition.type === "customer_labels") return op.value.includes("includes") || op.value.includes("excludes");
                      if (condition.type === "assigned_agent" || condition.type === "marketing_consent") return op.value === "is" || op.value === "is_not";
                      return op.value === "in" || op.value === "not_in";
                    })}
                    value={condition.operator}
                    onChange={(op) => handleConditionChange(index, { ...condition, operator: op } as any)}
                  />
                </div>
                <div className="flex-1">
                  {condition.type === "customer_labels" ? (
                    <TagPicker
                      mode="select"
                      target="CUSTOMER"
                      selectedTagIds={Array.isArray(condition.value) ? condition.value : []}
                      onChange={(tagIds) => handleConditionChange(index, { ...condition, value: tagIds } as any)}
                    />
                  ) : (
                    <Input
                      placeholder="Comma separated values (UUIDs or ENUMs)"
                      value={Array.isArray(condition.value) ? condition.value.join(",") : ""}
                      onChange={(e) => {
                        const arr = e.target.value.split(",").map(v => v.trim()).filter(v => v);
                        handleConditionChange(index, { ...condition, value: arr } as any);
                      }}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-10 p-0 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/50"
            onClick={() => handleRemoveCondition(index)}
          >
            <Trash className="h-4 w-4" />
          </Button>
          </div>
          {condition.type === "customer_labels" && condition.operator === "includes_any" && <p className="text-xs text-slate-500">{t("helperIncludesAny")}</p>}
          {condition.type === "customer_labels" && condition.operator === "includes_all" && <p className="text-xs text-slate-500">{t("helperIncludesAll")}</p>}
          {condition.type === "customer_labels" && condition.operator === "excludes_any" && <p className="text-xs text-slate-500">{t("helperExcludesAny")}</p>}
          {condition.type === "customer_labels" && condition.operator === "excludes_all" && <p className="text-xs text-slate-500">{t("helperExcludesAll")}</p>}
        </div>
      ))}

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
