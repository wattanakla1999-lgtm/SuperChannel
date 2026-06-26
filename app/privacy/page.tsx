import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | SuperChannel",
  description: "Privacy Policy for SuperChannel",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-900">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-slate-500">Last updated: June 26, 2026</p>

      <section className="mt-8 space-y-4">
        <p>
          SuperChannel helps businesses manage conversations, customer profiles,
          tags, segments, and campaigns across connected channels such as
          Facebook Messenger, Instagram, and LINE.
        </p>

        <h2 className="text-xl font-semibold">Information We Collect</h2>
        <p>
          We may collect account information, customer profile data,
          conversation messages, integration settings, page or account IDs, and
          metadata required to provide the service.
        </p>

        <h2 className="text-xl font-semibold">How We Use Information</h2>
        <p>
          We use this information to display conversations, manage customers,
          send replies, organize customer data, create segments, and support
          connected social messaging integrations.
        </p>

        <h2 className="text-xl font-semibold">Third-Party Integrations</h2>
        <p>
          When you connect Facebook Messenger or Instagram, SuperChannel may
          receive messages, sender IDs, page IDs, Instagram account IDs, and
          related messaging events through Meta APIs.
        </p>

        <h2 className="text-xl font-semibold">Data Security</h2>
        <p>
          We take reasonable steps to protect user data and integration
          credentials. Access tokens and sensitive credentials should be stored
          securely and used only to provide the requested service.
        </p>

        <h2 className="text-xl font-semibold">Data Deletion</h2>
        <p>
          You may request deletion of your data by contacting us at{" "}
          <a className="underline" href="mailto:wattana.kla.1999@gmail.com">
            wattana.kla.1999@gmail.com
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold">นโยบายความเป็นส่วนตัว</h2>
        <p>
          SuperChannel ใช้ข้อมูลเพื่อช่วยให้ธุรกิจจัดการแชท ลูกค้า แท็ก
          เซกเมนต์ และแคมเปญจากช่องทางที่เชื่อมต่อ เช่น Facebook Messenger,
          Instagram และ LINE
        </p>

        <p>
          หากต้องการสอบถามหรือลบข้อมูล กรุณาติดต่อ{" "}
          <a className="underline" href="mailto:wattana.kla.1999@gmail.com">
            wattana.kla.1999@gmail.com
          </a>
        </p>
      </section>
    </main>
  );
}