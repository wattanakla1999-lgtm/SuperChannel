import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | SuperChannel",
  description: "Terms of Service for SuperChannel",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-900">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-slate-500">Last updated: June 26, 2026</p>

      <section className="mt-8 space-y-4">
        <p>
          By using SuperChannel, you agree to use the service responsibly and in
          compliance with applicable laws and platform policies.
        </p>

        <h2 className="text-xl font-semibold">Service Description</h2>
        <p>
          SuperChannel provides tools for managing conversations, customers,
          tags, segments, campaigns, and connected messaging channels.
        </p>

        <h2 className="text-xl font-semibold">User Responsibilities</h2>
        <p>
          You are responsible for the data you connect, import, send, or manage
          through SuperChannel. You must have permission to access connected
          pages, accounts, and customer conversations.
        </p>

        <h2 className="text-xl font-semibold">Platform Policies</h2>
        <p>
          When using Facebook Messenger, Instagram, LINE, or other integrations,
          you must comply with the policies and terms of those platforms.
        </p>

        <h2 className="text-xl font-semibold">Prohibited Use</h2>
        <p>
          You may not use SuperChannel for spam, illegal activity, unauthorized
          data collection, abusive messaging, or violation of third-party
          platform rules.
        </p>

        <h2 className="text-xl font-semibold">Limitation of Liability</h2>
        <p>
          SuperChannel is provided as-is. We are not responsible for losses
          caused by misuse, unavailable third-party APIs, configuration errors,
          or platform restrictions.
        </p>

        <h2 className="text-xl font-semibold">Contact</h2>
        <p>
          For questions, contact{" "}
          <a className="underline" href="mailto:wattana.kla.1999@gmail.com">
            wattana.kla.1999@gmail.com
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold">ข้อกำหนดการใช้งาน</h2>
        <p>
          การใช้งาน SuperChannel หมายความว่าคุณตกลงใช้งานระบบอย่างถูกต้อง
          ไม่ละเมิดกฎหมาย และปฏิบัติตามนโยบายของแพลตฟอร์มที่เชื่อมต่อ
        </p>
      </section>
    </main>
  );
}