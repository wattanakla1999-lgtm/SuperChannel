import { appLocales, type AppLocale } from "@/features/settings/types/settings";

export const defaultLocale: AppLocale = "en";
export const localeCookieName = "superchannel_locale";
export const locales = appLocales;

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && locales.includes(value as AppLocale);
}
