/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import { segmentsApiClient } from "../services/segments-api-client";
import { Segment, SegmentCondition } from "../types/segments";
import { SegmentConditionBuilder } from "./segment-condition-builder";
import { SegmentConditionSchema } from "../schemas/segment-conditions.schema";
import { Dropdown } from "@/components/ui/dropdown";

interface SegmentEditorProps {
  segmentId: string | null;
  onBack: () => void;
}

export function SegmentEditor({ segmentId, onBack }: SegmentEditorProps) {
  const t = useTranslations("segments");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [matchType, setMatchType] = useState<"ALL" | "ANY">("ALL");
  const [conditions, setConditions] = useState<SegmentCondition[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const loadSegment = async () => {
    if (!segmentId) return;
    setIsLoading(true);
    try {
      const seg = await segmentsApiClient.getSegment(segmentId);
      setName(seg.name);
      setDescription(seg.description || "");
      setMatchType(seg.matchType);
      setConditions(seg.conditions as unknown as SegmentCondition[]);
    } catch (error) {
      alert(t("errorLoadingSegments"));
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (segmentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadSegment();
    }
  }, [segmentId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (conditions.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewCount(null);
      return;
    }

    const hasIncompleteConditions = conditions.some(c => !SegmentConditionSchema.safeParse(c).success);
    if (hasIncompleteConditions) {
      // Clear preview state entirely when incomplete
      setPreviewCount(null);
      setIsPreviewLoading(false);
      return;
    }

    const abortController = new AbortController();

    const handler = setTimeout(async () => {
      setIsPreviewLoading(true);
      try {
        const res = await segmentsApiClient.previewSegment({ matchType, conditions: conditions as any });
        if (!abortController.signal.aborted) {
          setPreviewCount(res.count);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          setPreviewCount(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsPreviewLoading(false);
        }
      }
    }, 800);

    return () => {
      clearTimeout(handler);
      abortController.abort();
    };
  }, [conditions, matchType]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        name,
        description,
        matchType,
        conditions: conditions as any,
      };
      
      if (segmentId) {
        await segmentsApiClient.updateSegment(segmentId, payload);
      } else {
        await segmentsApiClient.createSegment(payload);
      }
      onBack();
    } catch (error) {
      alert(t("errorSavingSegment"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex h-full min-h-[calc(100vh-97px)] flex-col px-4 py-4 lg:px-6 lg:py-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                {segmentId ? t("editSegment") : t("createSegment")}
              </h1>
            </div>
            <div className="shrink-0">
              <Button
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                loading={isSaving}
                className="w-auto whitespace-nowrap"
              >
                <Save className="mr-2 h-4 w-4" />
                {t("save")}
              </Button>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("segmentName")}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("segmentName")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("segmentDescription")}
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("segmentDescriptionPlaceholder")}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t("conditions")}
              </h2>
              <div className="w-full sm:w-72 md:w-80 lg:w-96">
                <Dropdown
                  ariaLabel="Match Type"
                  value={matchType}
                  onChange={(val) => setMatchType(val as "ALL" | "ANY")}
                  options={[
                    { label: t("matchAllShort"), value: "ALL" },
                    { label: t("matchAnyShort"), value: "ANY" },
                  ]}
                />
              </div>
            </div>

            <SegmentConditionBuilder
              conditions={conditions}
              onChange={setConditions}
            />
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t("preview")}</h2>
            {conditions.length === 0 ? (
              <p className="text-sm text-slate-500">{t("previewEmpty")}</p>
            ) : conditions.some(c => !SegmentConditionSchema.safeParse(c).success) ? (
              <p className="text-sm text-slate-500">{t("previewIncomplete")}</p>
            ) : isPreviewLoading ? (
              <p className="text-sm text-slate-500">{t("calculatingPreview")}</p>
            ) : previewCount !== null ? (
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {t("previewCount", { count: previewCount })}
              </p>
            ) : (
              <p className="text-sm text-red-500">{t("errorCalculatingPreview")}</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
