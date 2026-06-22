import type en from "./messages/en.json";
import type { AppLocale } from "./features/settings/types/settings";

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof en;
  }
}
