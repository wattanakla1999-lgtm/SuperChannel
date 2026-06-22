"use client";

import { useEffect, useState } from "react";
import { classNames } from "@/lib/class-names";

const THEME_STORAGE_KEY = "superchannel-theme";

function getPreferredTheme() {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent("superchannel-theme-change"));
}

export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const syncTheme = () => {
      setTheme(getPreferredTheme());
    };

    syncTheme();
    window.addEventListener("storage", syncTheme);
    window.addEventListener("superchannel-theme-change", syncTheme);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("superchannel-theme-change", syncTheme);
    };
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => applyTheme(isDark ? "light" : "dark")}
      className={classNames(
        "inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
        compact && "h-11 w-11 justify-center rounded-xl px-0",
        className,
      )}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span
        aria-hidden="true"
        className={classNames(
          "flex h-6 w-11 items-center rounded-full p-1 transition",
          isDark ? "bg-cyan-500 justify-end" : "bg-slate-300 justify-start",
        )}
      >
        <span className="block h-4 w-4 rounded-full bg-white" />
      </span>
      {!compact ? <span>{isDark ? "Dark mode" : "Light mode"}</span> : null}
    </button>
  );
}
