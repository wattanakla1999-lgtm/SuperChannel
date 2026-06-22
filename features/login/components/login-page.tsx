import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getTranslations } from "next-intl/server";

export async function LoginPage() {
  const t = await getTranslations("login");
  return (
    <main className="flex min-h-screen flex-1 bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_38%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-4 py-10 text-slate-950 dark:bg-[radial-gradient(circle_at_top,#164e63,transparent_32%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-[0_30px_90px_-45px_rgba(8,47,73,0.7)] sm:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-between gap-10 bg-slate-950 px-8 py-10 text-slate-50 sm:px-10 sm:py-12">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400 font-mono text-sm font-bold text-slate-950">
                    SC
                  </span>
                  <div>
                    <p className="text-sm font-semibold tracking-[0.24em] text-cyan-200 uppercase">
                      SuperChannel
                    </p>
                    <p className="text-xs text-slate-300">
                      {t("tagline")}
                    </p>
                  </div>
                </div>
                <ThemeToggle compact className="border-white/15 bg-white/10 text-white hover:bg-white/15 dark:border-white/10 dark:bg-white/5" />
              </div>
              <div className="space-y-4">
                <h1 className="max-w-md text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {t("welcome")}
                </h1>
                <p className="max-w-lg text-base leading-7 text-slate-300">
                  {t("intro")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
              <p className="font-semibold text-white">{t("demoAccess")}</p>
              <p>{t("emailValue", { email: "admin@superchannel.local" })}</p>
              <p>{t("passwordValue", { password: "SuperChannel123!" })}</p>
            </div>
          </section>

          <section className="flex items-center px-6 py-10 dark:bg-slate-950/40 sm:px-10 sm:py-12">
            <div className="mx-auto w-full max-w-md space-y-8">
              <div className="space-y-3">
                <p className="text-sm font-semibold tracking-[0.24em] text-sky-700 uppercase dark:text-cyan-300">
                  {t("eyebrow")}
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                  {t("title")}
                </h2>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {t("description")}
                </p>
              </div>

              <LoginForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
