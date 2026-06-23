"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SegmentEditor } from "./segment-editor";
import { SegmentList } from "./segment-list";

export function SegmentsWorkspace() {
  const t = useTranslations("segments");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setEditingSegmentId(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingSegmentId(id);
    setIsEditorOpen(true);
  };

  if (isEditorOpen) {
    return (
      <SegmentEditor
        segmentId={editingSegmentId}
        onBack={() => setIsEditorOpen(false)}
      />
    );
  }

  return (
    <main
      data-testid="segments-page"
      className="flex h-full min-h-[calc(100vh-97px)] flex-col px-4 py-4 lg:px-6 lg:py-6"
    >
      <div className="space-y-4">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                {t("title")}
              </h2>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                {t("description")}
              </p>
            </div>
            <div className="shrink-0">
              <Button onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createSegment")}
              </Button>
            </div>
          </div>
        </section>

        <section className="min-h-[24rem] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <SegmentList onEdit={handleEdit} />
        </section>
      </div>
    </main>
  );
}
