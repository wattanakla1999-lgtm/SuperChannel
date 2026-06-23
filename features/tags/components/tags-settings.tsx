"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { fetchTags, createTag, updateTag, mergeTags } from "../services/tags-api-client";
import type { Tag, TagTarget } from "../types/tags";
import { classNames } from "@/lib/class-names";
import { ApiError } from "@/lib/http/api-error";

export function TagsSettings({ canManageSettings }: { canManageSettings: boolean }) {
  const t = useTranslations("tags");
  const tCommon = useTranslations("common");

  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [targetFilter, setTargetFilter] = useState<TagTarget | "ALL">("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("");
  const [formTarget, setFormTarget] = useState<TagTarget>("CUSTOMER");
  const [isSaving, setIsSaving] = useState(false);

  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState<Tag | null>(null);
  const [mergeDestinationId, setMergeDestinationId] = useState("");
  
  const [toastMessage, setToastMessage] = useState<{title: string, type: "success"|"error"} | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchTags().then((data) => {
      if (mounted) {
        setTags(data);
        setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const filteredTags = useMemo(() => {
    return tags.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
      const matchTarget = targetFilter === "ALL" || t.target === targetFilter;
      return matchSearch && matchTarget && !t.isArchived; // Only show active by default? We'll show all or active. Let's just show all active and maybe archived if they want. Actually let's just show all and label archived.
    });
  }, [tags, search, targetFilter]);

  const openCreateModal = () => {
    setEditingTag(null);
    setFormName("");
    setFormDescription("");
    setFormColor("");
    setFormTarget("CUSTOMER");
    setIsModalOpen(true);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormDescription(tag.description || "");
    setFormColor(tag.color || "");
    setFormTarget(tag.target);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setIsSaving(true);
    try {
      if (editingTag) {
        const updated = await updateTag(editingTag.id, {
          name: formName,
          description: formDescription,
          color: formColor,
        });
        setTags(current => current.map(t => t.id === updated.id ? updated : t));
      } else {
        const created = await createTag({
          name: formName,
          description: formDescription,
          color: formColor,
          target: formTarget,
        });
        setTags(current => [...current, created]);
      }
      setIsModalOpen(false);
      setToastMessage({ title: t("saved"), type: "success" });
    } catch (err) {
      setToastMessage({ title: err instanceof ApiError ? err.message : tCommon("error"), type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (tag: Tag) => {
    if (!canManageSettings) return;
    try {
      const updated = await updateTag(tag.id, { isArchived: !tag.isArchived });
      setTags(current => current.map(t => t.id === updated.id ? updated : t));
      setToastMessage({ title: t("saved"), type: "success" });
    } catch {
      setToastMessage({ title: tCommon("error"), type: "error" });
    }
  };

  const openMergeModal = (tag: Tag) => {
    setMergeSource(tag);
    setMergeDestinationId("");
    setIsMergeModalOpen(true);
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeDestinationId) return;
    setIsSaving(true);
    try {
      await mergeTags({ sourceTagId: mergeSource.id, destinationTagId: mergeDestinationId });
      setTags(current => current.map(t => t.id === mergeSource.id ? { ...t, isArchived: true } : t));
      setIsMergeModalOpen(false);
      setToastMessage({ title: t("merged"), type: "success" });
    } catch {
      setToastMessage({ title: tCommon("error"), type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Input 
            placeholder={t("search")} 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <div className="flex items-center gap-2">
             <Button 
               variant={targetFilter === "ALL" ? "primary" : "secondary"} 
               onClick={() => setTargetFilter("ALL")}
             >
               {tCommon("all")}
             </Button>
             <Button 
               variant={targetFilter === "CUSTOMER" ? "primary" : "secondary"} 
               onClick={() => setTargetFilter("CUSTOMER")}
             >
               {t("customer")}
             </Button>
             <Button 
               variant={targetFilter === "CONVERSATION" ? "primary" : "secondary"} 
               onClick={() => setTargetFilter("CONVERSATION")}
             >
               {t("conversation")}
             </Button>
          </div>
        </div>
        {canManageSettings && (
          <Button onClick={openCreateModal}>{t("create")}</Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner /></div>
      ) : filteredTags.length === 0 ? (
        <EmptyState title={t("empty")} description="" />
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{t("name")}</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{t("target")}</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{t("usageCount")}</th>
                <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{tCommon("status")}</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredTags.map(tag => (
                <tr key={tag.id} className={classNames(tag.isArchived && "opacity-60")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {tag.color && (
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      )}
                      <span className="font-medium text-slate-900 dark:text-slate-100">{tag.name}</span>
                    </div>
                    {tag.description && <p className="text-xs text-slate-500 mt-1">{tag.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {tag.target === "CUSTOMER" ? t("customer") : t("conversation")}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{tag.usageCount}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {tag.isArchived ? t("archived") : t("active")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManageSettings && (
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEditModal(tag)} className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">{tCommon("edit")}</button>
                        <button type="button" onClick={() => openMergeModal(tag)} disabled={tag.isArchived} className="text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200">{t("merge")}</button>
                        <button type="button" onClick={() => handleArchive(tag)} className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">{tag.isArchived ? "Unarchive" : t("archive")}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal 
        title={editingTag ? t("edit") : t("create")} 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block" htmlFor="tag-name">{t("name")}</label>
              <Input id="tag-name" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block" htmlFor="tag-description">{t("tagDescription")}</label>
              <Input id="tag-description" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block" htmlFor="tag-color">{t("color")}</label>
              <Input id="tag-color" type="color" value={formColor} onChange={e => setFormColor(e.target.value)} className="h-10 w-20 p-1" />
            </div>
            {!editingTag && (
              <div>
                <label className="text-sm font-medium mb-1 block">{t("target")}</label>
                <div className="flex gap-2">
                  <Button variant={formTarget === "CUSTOMER" ? "primary" : "secondary"} onClick={() => setFormTarget("CUSTOMER")}>{t("customer")}</Button>
                  <Button variant={formTarget === "CONVERSATION" ? "primary" : "secondary"} onClick={() => setFormTarget("CONVERSATION")}>{t("conversation")}</Button>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{tCommon("cancel")}</Button>
              <Button onClick={handleSave} disabled={isSaving || !formName.trim()}>{isSaving ? tCommon("saving") : tCommon("save")}</Button>
            </div>
          </div>
        </Modal>

      <Modal title={t("merge")} isOpen={isMergeModalOpen} onClose={() => setIsMergeModalOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Select destination tag for {mergeSource?.name}. Source tag will be archived.
            </p>
            <select 
              className="w-full rounded-md border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-900"
              value={mergeDestinationId} 
              onChange={e => setMergeDestinationId(e.target.value)}
            >
              <option value="">Select destination...</option>
              {tags.filter(t => t.id !== mergeSource?.id && t.target === mergeSource?.target && !t.isArchived).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setIsMergeModalOpen(false)}>{tCommon("cancel")}</Button>
              <Button onClick={handleMerge} disabled={isSaving || !mergeDestinationId}>{isSaving ? tCommon("saving") : tCommon("save")}</Button>
            </div>
          </div>
        </Modal>

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            message={toastMessage.title}
            tone={toastMessage.type}
          />
        </div>
      )}
    </div>
  );
}
