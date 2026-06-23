"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { fetchTags } from "../services/tags-api-client";
import type { Tag, TagTarget } from "../types/tags";
import { classNames } from "@/lib/class-names";
import { X, Check, Plus } from "lucide-react";

export type TagPickerMode = "assign" | "select";

export interface TagPickerAssignProps {
  mode?: "assign";
  target: TagTarget;
  selectedTagIds: string[];
  onAssign: (tagId: string) => Promise<void>;
  onRemove: (tagId: string) => Promise<void>;
  onCreateInline?: (name: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export interface TagPickerSelectProps {
  mode: "select";
  target: TagTarget;
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export type TagPickerProps = TagPickerAssignProps | TagPickerSelectProps;

export function TagPicker(props: TagPickerProps) {
  const { target, selectedTagIds, disabled, placeholder } = props;
  const mode = props.mode || "assign";
  const t = useTranslations("tags");
  const tCommon = useTranslations("common");
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [optimisticSelectedIds, setOptimisticSelectedIds] = useState<string[]>(selectedTagIds);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptimisticSelectedIds(selectedTagIds);
  }, [selectedTagIds]);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    fetchTags(target).then(data => {
      if (mounted) {
        setTags(data.filter(t => !t.isArchived || selectedTagIds.includes(t.id)));
        setIsLoading(false);
      }
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [target]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTags = useMemo(() => {
    return tags.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  }, [tags, search]);

  const exactMatch = tags.find(t => t.name.toLowerCase() === search.toLowerCase());

  const toggleTag = async (tag: Tag) => {
    if (disabled || isProcessing || tag.isArchived) return;
    
    const isCurrentlySelected = optimisticSelectedIds.includes(tag.id);
    const newSelectedIds = isCurrentlySelected ? optimisticSelectedIds.filter(id => id !== tag.id) : [...optimisticSelectedIds, tag.id];

    if (mode === "select") {
      setOptimisticSelectedIds(newSelectedIds);
      (props as TagPickerSelectProps).onChange(newSelectedIds);
      return;
    }

    setIsProcessing(tag.id);
    setOptimisticSelectedIds(newSelectedIds);
    try {
      if (isCurrentlySelected) {
        await (props as TagPickerAssignProps).onRemove(tag.id);
      } else {
        await (props as TagPickerAssignProps).onAssign(tag.id);
      }
    } catch (err) {
      setOptimisticSelectedIds(selectedTagIds);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCreate = async () => {
    if (disabled || isProcessing || mode !== "assign" || !(props as TagPickerAssignProps).onCreateInline || !search.trim()) return;
    setIsProcessing("create");
    try {
      await (props as TagPickerAssignProps).onCreateInline!(search.trim());
      setSearch("");
      const updated = await fetchTags(target);
      setTags(updated.filter(t => !t.isArchived || selectedTagIds.includes(t.id)));
      
      // Optionally, we could optimistically select the new tag if we know its ID, 
      // but since we just fetch all tags, we rely on parent's selectedTagIds to update it.
    } finally {
      setIsProcessing(null);
    }
  };

  const selectedTags = tags.filter(t => optimisticSelectedIds.includes(t.id));

  return (
    <div className="relative" ref={ref}>
      <div 
        className={classNames(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-800 dark:bg-slate-950",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {selectedTags.length === 0 && <span className="text-slate-500">{placeholder || `${t("search")}...`}</span>}
        {selectedTags.map(tag => (
          <span 
            key={tag.id} 
            className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100"
          >
            {tag.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />}
            {tag.name}
            {!disabled && (
              <button 
                type="button" 
                disabled={isProcessing === tag.id}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50"
                onClick={(e) => {
                  e.stopPropagation();
                  // In assign mode, removing an archived tag via chip is allowed
                  if (tag.isArchived) {
                     if (mode === "select") {
                       const newSelectedIds = optimisticSelectedIds.filter(id => id !== tag.id);
                       setOptimisticSelectedIds(newSelectedIds);
                       (props as TagPickerSelectProps).onChange(newSelectedIds);
                     } else {
                       // Direct assign mode removal logic
                       setIsProcessing(tag.id);
                       setOptimisticSelectedIds(optimisticSelectedIds.filter(id => id !== tag.id));
                       (props as TagPickerAssignProps).onRemove(tag.id).catch(() => setOptimisticSelectedIds(selectedTagIds)).finally(() => setIsProcessing(null));
                     }
                  } else {
                    toggleTag(tag);
                  }
                }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      {isOpen && (
        <div className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-md dark:border-slate-800 dark:bg-slate-950">
          <div className="p-1 sticky top-0 bg-white dark:bg-slate-950 z-10 border-b border-slate-100 dark:border-slate-800">
            <Input 
              autoFocus
              placeholder={placeholder || t("search")} 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-4"><Spinner className="w-4 h-4" /></div>
          ) : (
            <div className="mt-1">
              {filteredTags.map(tag => {
                const isSelected = optimisticSelectedIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={isProcessing === tag.id || tag.isArchived}
                    onClick={() => toggleTag(tag)}
                    className={classNames(
                      "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
                      tag.isArchived ? "opacity-50 cursor-not-allowed" : "disabled:opacity-50"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {tag.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />}
                      <span className={tag.isArchived ? "line-through text-slate-500" : ""}>{tag.name}</span>
                    </span>
                    {isSelected ? (
                      <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    ) : null}
                  </button>
                );
              })}
              
              {search.trim() && !exactMatch && mode === "assign" && (props as TagPickerAssignProps).onCreateInline && (
                <button
                  type="button"
                  disabled={isProcessing === "create"}
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-950/30 disabled:opacity-50"
                >
                  {isProcessing === "create" ? <Spinner className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> : <Plus className="w-4 h-4" />}
                  {t("createInline", { name: search.trim() })}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
