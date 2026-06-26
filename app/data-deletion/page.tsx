import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion Instructions | SuperChannel",
  description: "Instructions for requesting data deletion from SuperChannel",
};

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-900">
      <h1 className="text-3xl font-bold">Data Deletion Instructions</h1>
      <p className="mt-2 text-slate-500">Last updated: June 26, 2026</p>

      <section className="mt-8 space-y-4">
        <p>
          If you want to delete your data from SuperChannel, please send a data
          deletion request to:
        </p>

        <p>
          <a className="font-semibold underline" href="mailto:wattana.kla.1999@gmail.com">
            wattana.kla.1999@gmail.com
          </a>
        </p>

        <p>
          Please use the subject line: <strong>Data Deletion Request</strong>
        </p>

        <h2 className="text-xl font-semibold">Please Include</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Your name or business name</li>
          <li>Your Facebook Page name, if applicable</li>
          <li>Your Instagram username, if applicable</li>
          <li>The email address related to your SuperChannel account</li>
          <li>A short description of the data you want deleted</li>
        </ul>

        <h2 className="text-xl font-semibold">What We Delete</h2>
        <p>
          After verification, we will delete or anonymize related customer
          profiles, conversations, integration records, access tokens, and other
          account data where legally permitted.
        </p>

        <h2 className="text-xl font-semibold">Processing Time</h2>
        <p>
          We will review deletion requests and process them within a reasonable
          time after confirming ownership of the account or connected channel.
        </p>

        <h2 className="text-xl font-semibold">คำแนะนำการลบข้อมูล</h2>
        <p>
          หากคุณต้องการลบข้อมูลออกจาก SuperChannel กรุณาส่งคำขอมาที่{" "}
          <a className="underline" href="mailto:wattana.kla.1999@gmail.com">
            wattana.kla.1999@gmail.com
          </a>{" "}
          โดยใช้หัวข้ออีเมลว่า <strong>Data Deletion Request</strong>
        </p>

        <p>
          กรุณาระบุชื่อธุรกิจ ชื่อเพจ Facebook ชื่อผู้ใช้ Instagram
          หรืออีเมลที่เกี่ยวข้องกับบัญชี เพื่อให้เราตรวจสอบและดำเนินการลบข้อมูลได้ถูกต้อง
        </p>
      </section>
    </main>
  );
}