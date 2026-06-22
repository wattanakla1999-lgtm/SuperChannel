"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import type { AppLocale } from "@/features/settings/types/settings";
import { updateLocale } from "@/features/settings/services/settings-service";
import { classNames } from "@/lib/class-names";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const handleChange = (nextLocale: AppLocale) => {
    if (nextLocale === locale) {
      return;
    }

    document.cookie = `superchannel_locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const navigate = () => window.location.assign(window.location.href);
    const fallback = window.setTimeout(navigate, 500);

    void updateLocale(nextLocale).finally(() => {
      window.clearTimeout(fallback);
      navigate();
    });
  };

  const nextLocale: AppLocale = locale === "en" ? "th" : "en";

  return (
    <button
      type="button"
      aria-label={t("switchLanguage")}
      data-testid="language-switcher"
      disabled={!isHydrated}
      onClick={() => handleChange(nextLocale)}
      className={classNames(
        "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        className,
      )}
    >
      <span className="sr-only">{t("switchLanguage")}</span>
      <span aria-hidden="true">{nextLocale === "th" ? t("thai") : t("english")}</span>
    </button>
  );
}
