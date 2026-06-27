"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { classNames } from "@/lib/class-names";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  Loader2,
  Image as LucideImage,
  Upload as LucideUpload,
  Megaphone,
  MessageSquare,
  Search,
  Send,
  Trash2,
  Users
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IntegrationProvider } from "@prisma/client";

type Step = 1 | 2 | 3 | 4 | 5;

type MessageBlock = {
  type: "TEXT" | "IMAGE";
  textContent?: string;
  imageUrl?: string;
  previewImageUrl?: string;
};

type SegmentOption = { id: string; name: string; description?: string | null };
type LineCustomerOption = { lineUserId: string; customerName: string; handle: string; channel: IntegrationProvider };

// ─── Searchable Select ────────────────────────────────────────────────────────
function SearchableSelect<T>({
  placeholder,
  value,
  displayValue,
  items,
  isLoading,
  searchQuery,
  onSearchChange,
  onSelect,
  renderItem,
  emptyText = "ไม่พบรายการ",
}: {
  placeholder: string;
  value: string;
  displayValue: string;
  items: T[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelect: (item: T) => void;
  renderItem: (item: T) => { label: string; sub?: string; key: string };
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={classNames(
          "w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm text-left transition-colors",
          "border-slate-300 bg-white shadow-sm hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500",
          "dark:border-slate-600 dark:bg-slate-800 dark:text-white",
          !value && "text-slate-400"
        )}
      >
        <span className="truncate">{value ? displayValue : placeholder}</span>
        <ChevronDown className={classNames("h-4 w-4 text-slate-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-700">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
              placeholder="ค้นหา..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Items */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {isLoading ? (
              <li className="flex items-center justify-center py-4 text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังโหลด...
              </li>
            ) : items.length === 0 ? (
              <li className="py-4 text-center text-sm text-slate-400">{emptyText}</li>
            ) : (
              items.map((item) => {
                const { label, sub, key } = renderItem(item);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                      onClick={() => {
                        onSelect(item);
                        setOpen(false);
                        onSearchChange("");
                      }}
                    >
                      <div className="font-medium text-slate-900 dark:text-white">{label}</div>
                      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Image Upload Input ──────────────────────────────────────────────────────
function ImageUploadInput({
  value,
  onChange,
  onPreviewChange,
}: {
  value: string;
  onChange: (url: string) => void;
  onPreviewChange?: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/campaigns/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "อัปโหลดภาพไม่สำเร็จ");
      }

      const { url } = await res.json();
      onChange(url);
      if (onPreviewChange) {
        onPreviewChange(url);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700 bg-white/50 dark:bg-slate-950/20">
      <div className="flex items-center gap-4">
        {value ? (
          <button
            type="button"
            onClick={() => setIsViewerOpen(true)}
            title="คลิกเพื่อดูรูปขนาดจริง"
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" className="h-full w-full object-cover transition group-hover:scale-105" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
              <span className="text-[10px] font-medium text-white">คลิกลิเพื่อดูภาพ</span>
            </div>
          </button>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-slate-400">
            <LucideImage className="h-8 w-8" />
          </div>
        )}

        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 py-1 px-3 text-xs"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LucideUpload className="h-4 w-4" />
              )}
              {isUploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปภาพ"}
            </Button>
            {value && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onChange("");
                  if (onPreviewChange) onPreviewChange("");
                }}
                className="text-xs text-red-500 hover:text-red-600 transition-colors bg-transparent border-0"
              >
                ลบรูปภาพ
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500">รองรับ JPG, PNG หรือ WebP ขนาดไม่เกิน 5MB</p>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
        accept="image/*"
        className="hidden"
      />

      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">หรือป้อน URL รูปภาพโดยตรง</label>
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (onPreviewChange) onPreviewChange(e.target.value);
          }}
          placeholder="https://example.com/image.jpg"
          className="text-xs"
        />
      </div>

      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {error}</p>}

      {isViewerOpen && (
        <Modal isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} title="ดูรูปภาพขนาดจริง">
          <div className="flex justify-center items-center p-2 bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden max-h-[70vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Full view" className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm" />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Campaign Builder ─────────────────────────────────────────────────────────
interface CampaignBuilderProps {
  campaignId?: string;
}

export function CampaignBuilder({ campaignId }: CampaignBuilderProps) {
  const t = useTranslations("campaigns");
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState<IntegrationProvider>("LINE");
  const [targetType, setTargetType] = useState<"BROADCAST" | "TARGETED">("BROADCAST");

  // Segment picker
  const [segmentId, setSegmentId] = useState("");
  const [segmentName, setSegmentName] = useState("");
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [segmentSearch, setSegmentSearch] = useState("");

  // Messages
  const [messages, setMessages] = useState<MessageBlock[]>([{ type: "TEXT", textContent: "" }]);

  // LINE customer picker (Test step)
  const [testUserId, setTestUserId] = useState("");
  const [testUserDisplay, setTestUserDisplay] = useState("");
  const [testUserChannel, setTestUserChannel] = useState<IntegrationProvider>("LINE");
  const [lineCustomers, setLineCustomers] = useState<LineCustomerOption[]>([]);
  const [lineCustomersLoading, setLineCustomersLoading] = useState(false);
  const [lineCustomerSearch, setLineCustomerSearch] = useState("");

  // Schedule
  const [isImmediate, setIsImmediate] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");

  // Action states
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(!!campaignId);

  // If edit mode: fetch existing campaign on mount
  useEffect(() => {
    if (!campaignId) return;

    const getCampaign = async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}`);
        if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลแคมเปญได้");
        const data = await res.json();

        setName(data.name || "");
        setDescription(data.description || "");
        setChannel(data.channel || "LINE");
        setTargetType(data.targetType || "BROADCAST");
        setSegmentId(data.segmentId || "");
        if (data.segment) {
          setSegmentName(data.segment.name || "");
        }

        if (data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((m: { type: "TEXT" | "IMAGE"; textContent?: string; imageUrl?: string; previewImageUrl?: string }) => ({
              type: m.type,
              textContent: m.textContent || "",
              imageUrl: m.imageUrl || "",
              previewImageUrl: m.previewImageUrl || "",
            }))
          );
        }

        if (data.scheduledAt) {
          setIsImmediate(false);
          const dt = new Date(data.scheduledAt);
          // format local datetime-local value (YYYY-MM-DDTHH:MM)
          const timezoneOffset = dt.getTimezoneOffset() * 60000;
          const localOffsetValue = new Date(dt.getTime() - timezoneOffset);
          setScheduledAt(localOffsetValue.toISOString().slice(0, 16));
        } else {
          setIsImmediate(true);
        }
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsInitialLoading(false);
      }
    };

    getCampaign();
  }, [campaignId]);

  const steps = [
    { id: 1, title: t("stepSetup"), icon: Megaphone },
    { id: 2, title: t("stepAudience"), icon: Users },
    { id: 3, title: t("stepMessage"), icon: MessageSquare },
    { id: 4, title: t("stepTest"), icon: Send },
    { id: 5, title: t("stepSchedule"), icon: Calendar },
  ];

  // Load segments when targeted is selected
  useEffect(() => {
    if (targetType !== "TARGETED") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSegmentsLoading(true);
    fetch(`/api/segments?limit=50&search=${encodeURIComponent(segmentSearch)}`)
      .then((r) => r.json())
      // eslint-disable-next-line react-hooks/set-state-in-effect
      .then((data) => setSegments(data.data ?? []))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      .catch(() => setSegments([]))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      .finally(() => setSegmentsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, segmentSearch]);

  // Load channel customers when on step 4
  useEffect(() => {
    if (step !== 4) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLineCustomersLoading(true);
    fetch(`/api/campaigns/line-customers?channel=ALL&search=${encodeURIComponent(lineCustomerSearch)}`)
      .then((r) => r.json())
      // eslint-disable-next-line react-hooks/set-state-in-effect
      .then((data) => setLineCustomers(Array.isArray(data) ? data : []))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      .catch(() => setLineCustomers([]))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      .finally(() => setLineCustomersLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lineCustomerSearch]);

  const handleNext = () => setStep((s) => Math.min(s + 1, 5) as Step);
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const addMessage = (type: "TEXT" | "IMAGE") => {
    if (messages.length >= 5) return;
    setMessages([...messages, { type, textContent: "", imageUrl: "", previewImageUrl: "" }]);
  };

  const removeMessage = (index: number) => {
    setMessages(messages.filter((_, i) => i !== index));
  };

  const updateMessage = (index: number, updates: Partial<MessageBlock>) => {
    setMessages((prevMessages) => {
      const newMsgs = [...prevMessages];
      newMsgs[index] = { ...newMsgs[index], ...updates };
      return newMsgs;
    });
  };

  const handleSendTest = async () => {
    if (!testUserId.trim()) {
      setTestResult({ success: false, message: `กรุณาเลือกลูกค้าที่มี ${testUserChannel} ก่อนส่งทดสอบ` });
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/campaigns/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId: testUserId, messages, channel: testUserChannel }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "ส่งข้อความทดสอบไม่สำเร็จ");
      }
      setTestResult({ success: true, message: `ส่งสำเร็จไปยัง ${testUserDisplay}! กรุณาตรวจสอบ ${testUserChannel}` });
    } catch (err: unknown) {
      setTestResult({ success: false, message: (err as Error).message });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSave = async (forceAsDraft: boolean = false) => {
    if (!name.trim()) { setSaveError("กรุณาใส่ชื่อแคมเปญ (ขั้นตอนที่ 1)"); return; }
    if (messages.length === 0) { setSaveError("กรุณาเพิ่มข้อความอย่างน้อย 1 ชิ้น (ขั้นตอนที่ 3)"); return; }
    if (!forceAsDraft && !isImmediate && !scheduledAt) { setSaveError("กรุณาเลือกวันและเวลาส่ง"); return; }
    if (targetType === "TARGETED" && !segmentId) { setSaveError("กรุณาเลือกกลุ่มเป้าหมาย (ขั้นตอนที่ 2)"); return; }

    setIsSaving(true);
    setSaveError(null);
    try {
      const endpoint = campaignId ? `/api/campaigns/${campaignId}` : "/api/campaigns";
      const method = campaignId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          channel,
          targetType,
          segmentId: targetType === "TARGETED" ? segmentId : null,
          scheduledAt: forceAsDraft || isImmediate ? null : new Date(scheduledAt).toISOString(),
          isDraft: forceAsDraft,
          messages,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "บันทึกแคมเปญไม่สำเร็จ");
      }
      router.push("/campaigns");
      router.refresh();
    } catch (err: unknown) {
      setSaveError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
        <p className="mt-2 text-sm text-slate-500">กำลังโหลดคำขอแคมเปญ...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Step Header */}
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center justify-between w-full">
            {steps.map((s, idx) => (
              <li key={s.id} className={classNames(
                "flex items-center",
                idx < steps.length - 1 ? "flex-1" : ""
              )}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={classNames(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                    step > s.id ? "border-cyan-600 bg-cyan-600 text-white" :
                    step === s.id ? "border-cyan-600 bg-white text-cyan-600 dark:bg-slate-900 dark:text-cyan-500" :
                    "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                  )}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <span className={classNames(
                    "hidden sm:block text-xs font-medium whitespace-nowrap",
                    step === s.id ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"
                  )}>{s.title}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={classNames(
                    "h-0.5 w-full flex-1 mx-2 sm:mx-4 shrink-1 mb-5 transition-colors",
                    step > s.id ? "bg-cyan-500" : "bg-slate-200 dark:bg-slate-700"
                  )} />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="p-6">

        {/* Step 1: Setup */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("stepSetup")}</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("campaignName")} <span className="text-red-500">*</span>
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Flash Sale มิถุนายน 2026" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t("description")}</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="คำอธิบายเพิ่มเติม (ไม่บังคับ)" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Audience */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("stepAudience")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button type="button"
                className={classNames("flex flex-col gap-1 p-4 border-2 rounded-lg text-left transition-all",
                  targetType === "BROADCAST" ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500 dark:bg-cyan-950/30" : "border-slate-200 hover:border-slate-300 dark:border-slate-700")}
                onClick={() => setTargetType("BROADCAST")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">{t("broadcast")}</span>
                  {targetType === "BROADCAST" && <div className="h-2 w-2 rounded-full bg-cyan-500" />}
                </div>
                <p className="text-sm text-slate-500">{t("broadcastDesc")}</p>
              </button>
              <button type="button"
                className={classNames("flex flex-col gap-1 p-4 border-2 rounded-lg text-left transition-all",
                  targetType === "TARGETED" ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500 dark:bg-cyan-950/30" : "border-slate-200 hover:border-slate-300 dark:border-slate-700")}
                onClick={() => setTargetType("TARGETED")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">{t("targeted")}</span>
                  {targetType === "TARGETED" && <div className="h-2 w-2 rounded-full bg-cyan-500" />}
                </div>
                <p className="text-sm text-slate-500">{t("targetedDesc")}</p>
              </button>
            </div>

            {targetType === "TARGETED" && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("segment")} <span className="text-red-500">*</span>
                </label>
                <SearchableSelect<SegmentOption>
                  placeholder="เลือกกลุ่มลูกค้า..."
                  value={segmentId}
                  displayValue={segmentName}
                  items={segments}
                  isLoading={segmentsLoading}
                  searchQuery={segmentSearch}
                  onSearchChange={setSegmentSearch}
                  onSelect={(seg) => {
                    setSegmentId(seg.id);
                    setSegmentName(seg.name);
                  }}
                  renderItem={(seg) => ({
                    key: seg.id,
                    label: seg.name,
                    sub: seg.description ?? undefined,
                  })}
                  emptyText="ไม่พบกลุ่มลูกค้า"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Message */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("stepMessage")}</h2>
              <span className="text-xs text-slate-400">{messages.length}/5</span>
            </div>
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {msg.type === "TEXT" ? "✉️ ข้อความ" : "🖼️ รูปภาพ"} #{idx + 1}
                    </span>
                    {messages.length > 1 && (
                      <button type="button" onClick={() => removeMessage(idx)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        <Trash2 className="h-3 w-3" /> ลบ
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {msg.type === "TEXT" ? (
                      <textarea
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        rows={3}
                        value={msg.textContent}
                        onChange={(e) => updateMessage(idx, { textContent: e.target.value })}
                        placeholder="พิมพ์ข้อความที่ต้องการส่ง..."
                      />
                    ) : (
                      <div className="space-y-2">
                        <ImageUploadInput
                          value={msg.imageUrl || ""}
                          onChange={(url) => updateMessage(idx, { imageUrl: url })}
                          onPreviewChange={(url) => updateMessage(idx, { previewImageUrl: url })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {messages.length < 5 && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => addMessage("TEXT")} className="flex-1">+ เพิ่มข้อความ</Button>
                  <Button variant="secondary" onClick={() => addMessage("IMAGE")} className="flex-1">+ เพิ่มรูปภาพ</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Test */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("stepTest")}</h2>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300">
              ⚠️ ข้อความทดสอบจะถูกส่งจริงไปยังช่องทาง (LINE/Facebook/Instagram) ของลูกค้าที่เลือก
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                ลูกค้าผู้รับข้อความทดสอบ {testUserId ? `(${testUserChannel})` : ""} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect<LineCustomerOption>
                placeholder="ค้นหาลูกค้าที่มี LINE, Facebook หรือ Instagram..."
                value={testUserId}
                displayValue={testUserDisplay}
                items={lineCustomers}
                isLoading={lineCustomersLoading}
                searchQuery={lineCustomerSearch}
                onSearchChange={setLineCustomerSearch}
                onSelect={(c) => {
                  setTestUserId(c.lineUserId);
                  setTestUserChannel(c.channel);
                  setTestUserDisplay(`${c.customerName} (${c.channel})`);
                  setTestResult(null);
                }}
                renderItem={(c) => ({
                  key: c.lineUserId,
                  label: `${c.customerName} (${c.channel})`,
                  sub: c.lineUserId,
                })}
                emptyText="ไม่พบลูกค้าที่มี ID ช่องทางใดๆ"
              />
              {testUserId && (
                <p className="text-xs text-slate-500 font-mono break-all">{testUserChannel} ID: {testUserId}</p>
              )}
              <Button onClick={handleSendTest} disabled={isSendingTest || !testUserId}>
                {isSendingTest ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังส่ง...</> : <><Send className="mr-2 h-4 w-4" />{t("sendTest")}</>}
              </Button>
              {testResult && (
                <div className={classNames("flex items-start gap-2 rounded-md p-3 text-sm",
                  testResult.success ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300" : "bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-300")}>
                  {testResult.success ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  {testResult.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Schedule */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("stepSchedule")}</h2>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">สรุปแคมเปญ</p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">ชื่อ</span><span className="font-medium">{name || "-"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">กลุ่มเป้าหมาย</span><span className="font-medium">{targetType === "BROADCAST" ? "Broadcast" : segmentName || "Targeted"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ข้อความ</span><span className="font-medium">{messages.length} ชิ้น</span></div>
              </div>
            </div>
            <div className="space-y-4 pt-2">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="scheduleType"
                  className="h-4 w-4 border-slate-300 text-cyan-600 focus:ring-cyan-600 dark:border-slate-600 dark:bg-slate-700"
                  checked={isImmediate}
                  onChange={() => { setIsImmediate(true); setSaveError(null); }}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">สร้างและส่งทันที</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="scheduleType"
                  className="h-4 w-4 border-slate-300 text-cyan-600 focus:ring-cyan-600 dark:border-slate-600 dark:bg-slate-700"
                  checked={!isImmediate}
                  onChange={() => { setIsImmediate(false); setSaveError(null); }}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">ตั้งเวลาส่งล่วงหน้า</span>
              </label>

              {!isImmediate && (
                <div className="pl-7 space-y-1.5 animate-in fade-in slide-in-from-top-1">
                  <Input type="datetime-local" value={scheduledAt} onChange={(e) => { setScheduledAt(e.target.value); setSaveError(null); }} />
                </div>
              )}
            </div>
            {saveError && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{saveError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-lg dark:border-slate-800 dark:bg-slate-900/50">
        <Button variant="secondary" onClick={handlePrev} disabled={step === 1 || isSaving}>{t("prev")}</Button>
        {step < 5 ? (
          <Button onClick={handleNext}>{t("next")}</Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="border-slate-300 dark:border-slate-700"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "บันทึกเป็นแบบร่าง (ยังไม่ส่ง)"}
            </Button>
            <Button onClick={() => handleSave(false)} disabled={isSaving} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังบันทึก...</> : 
               isImmediate ? <><Send className="mr-2 h-4 w-4" />สร้างและส่งทันที</> :
               <><Calendar className="mr-2 h-4 w-4" />ตั้งเวลาส่ง</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
