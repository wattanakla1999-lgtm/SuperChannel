"use client";

import { classNames } from "@/lib/class-names";
import { Users, Megaphone, Calendar, MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CampaignView({ campaign }: { campaign: any }) {

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
      case "SCHEDULED": return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
      case "SENDING": return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
      case "COMPLETED": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
      case "PARTIAL_FAILED": return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
      case "FAILED": return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
      case "CANCELLED": return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/campaigns"
          className="-ml-2 shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="truncate text-xl font-semibold text-slate-900 dark:text-white">
              {campaign.name}
            </h2>
            <span
              className={classNames(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                getStatusColor(campaign.status)
              )}
            >
              {campaign.status}
            </span>
          </div>
          {campaign.description && (
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              {campaign.description}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Settings Card */}
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-base font-medium text-slate-900 dark:text-white">ตั้งค่าแคมเปญ</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Users className="h-4 w-4" />
                กลุ่มเป้าหมาย
              </dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                {campaign.targetType === "BROADCAST" ? (
                  "ส่งให้ทุกคน (Broadcast)"
                ) : (
                  campaign.segment?.name || "ไม่ระบุเซกเมนต์"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                ช่องทาง
              </dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                {campaign.channel} {campaign.integration ? `(${campaign.integration.name})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                กำหนดเวลาส่ง
              </dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                {campaign.scheduledAt ? (
                  new Date(campaign.scheduledAt).toLocaleString("th-TH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                ) : (
                  "ส่งทันที"
                )}
              </dd>
            </div>
            {campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED" && campaign.status !== "CANCELLED" && (
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  จำนวนที่ส่ง
                </dt>
                <dd className="mt-1 text-sm text-slate-900 dark:text-white">
                  {campaign._count?.recipients || 0} คน
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Messages Card */}
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            ข้อความ ({campaign.messages?.length || 0})
          </h3>
          <div className="space-y-4">
            {campaign.messages?.map((msg: { id: string; type: string; textContent?: string; imageUrl?: string }, index: number) => (
              <div key={msg.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  บอลลูนที่ {index + 1}
                </div>
                {msg.type === "TEXT" ? (
                  <p className="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">
                    {msg.textContent}
                  </p>
                ) : (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={msg.imageUrl} 
                      alt="Campaign image"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
            {(!campaign.messages || campaign.messages.length === 0) && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                ไม่มีข้อความ
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
