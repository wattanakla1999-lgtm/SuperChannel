"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { classNames } from "@/lib/class-names";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState, useSyncExternalStore } from "react";
import { logout } from "../services/inbox-service";

type AuthenticatedShellProps = {
  activeNavigation: "customers" | "inbox" | "publishing" | "integrations" | "team" | "settings";
  children: ReactNode;
  sectionLabel: string;
  user: {
    email: string;
    name: string;
    organizationName: string;
    role: string;
  };
};

const navigationItems = [
  { href: "/inbox", key: "inbox", label: "Inbox" },
  { href: "/publishing", key: "publishing", label: "Publishing" },
  { href: "/integrations", key: "integrations", label: "Integrations" },
  { href: "/customers", key: "customers", label: "Customers" },
  { href: "/team", key: "team", label: "Team" },
  { href: "/ ", key: "settings", label: "Settings" },
];

export function AuthenticatedShell({
  activeNavigation,
  children,
  sectionLabel,
  user,
}: AuthenticatedShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const handleLogout = async () => {
    if (isLoggingOut || !isHydrated) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout();
      window.location.assign("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_45%,#cbd5e1_100%)] dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)]">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <aside
          className={classNames(
            "border-b border-slate-200/80 bg-slate-950 text-slate-100 transition-[width] duration-200 lg:flex lg:flex-col lg:border-b-0 lg:border-r lg:border-slate-800 dark:border-slate-800 dark:bg-slate-950",
            isSidebarCollapsed ? "lg:w-24" : "lg:w-80",
          )}
        >
          <div
            className={classNames(
              "flex items-center justify-between px-5 py-4 lg:px-6 lg:py-6",
              isSidebarCollapsed && "lg:flex-col lg:items-center lg:justify-start lg:gap-4",
            )}
          >
            <div
              className={classNames(
                "flex items-center gap-3",
                isSidebarCollapsed && "lg:order-2 lg:flex-col",
              )}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 font-mono text-sm font-bold text-slate-950">
                SC
              </div>
              <div className={classNames(isSidebarCollapsed && "lg:hidden")}>
                <p className="text-sm font-semibold tracking-[0.24em] text-cyan-300 uppercase">
                  SuperChannel
                </p>
                <p className="text-xs text-slate-400">Operator workspace</p>
              </div>
            </div>
            <div
              className={classNames(
                "flex items-center gap-2",
                isSidebarCollapsed && "lg:order-1 lg:w-full lg:justify-center",
              )}
            >
              <button
                type="button"
                className="hidden h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-200 transition hover:bg-white/10 lg:inline-flex"
                onClick={() => setIsSidebarCollapsed((current) => !current)}
                aria-pressed={isSidebarCollapsed}
                aria-label={isSidebarCollapsed ? "Expand left menu" : "Collapse left menu"}
              >
                <span className="sr-only">
                  {isSidebarCollapsed ? "Expand left menu" : "Collapse left menu"}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="block h-0.5 w-5 rounded-full bg-current" />
                  <span className="block h-0.5 w-5 rounded-full bg-current" />
                  <span className="block h-0.5 w-5 rounded-full bg-current" />
                </span>
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 lg:hidden"
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-sidebar"
              >
                {isMenuOpen ? "Close" : "Menu"}
              </button>
            </div>
          </div>

          <div
            id="mobile-sidebar"
            className={classNames(
              "hidden border-t border-slate-800 px-4 pb-5 lg:block lg:flex-1 lg:border-t-0 lg:px-5",
              isMenuOpen && "block",
            )}
          >
            <div className="flex h-full flex-col">
            <nav className="space-y-2 py-4">
              {navigationItems.map((item) => (
                item.href ? (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={activeNavigation === item.key ? "page" : undefined}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={classNames(
                      "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isSidebarCollapsed ? "justify-center lg:px-3" : "justify-between",
                      activeNavigation === item.key
                        ? "bg-cyan-400 text-slate-950"
                        : "bg-white/5 text-slate-300 hover:bg-white/10",
                    )}
                  >
                    <span className={classNames(isSidebarCollapsed && "lg:hidden")}>{item.label}</span>
                    <span
                      aria-hidden="true"
                      className={classNames(
                        "font-semibold tracking-wide",
                        !isSidebarCollapsed && "lg:hidden",
                      )}
                    >
                      {item.label.slice(0, 2).toUpperCase()}
                    </span>
                    {activeNavigation === item.key && !isSidebarCollapsed ? (
                      <span className="rounded-full bg-slate-950/10 px-2 py-1 text-[11px]">
                        Active
                      </span>
                    ) : null}
                  </Link>
                ) : (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm font-medium text-slate-300"
                  >
                    <span>{item.label}</span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-400">
                      Coming soon
                    </span>
                  </div>
                )
              ))}
            </nav>

            <div
              className={classNames(
                "mt-auto space-y-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-4",
                isSidebarCollapsed && "lg:flex lg:flex-col lg:items-center lg:rounded-[2rem] lg:px-3 lg:py-4",
              )}
            >
              <ThemeToggle
                compact={isSidebarCollapsed}
                className={classNames(
                  "w-full border-white/10 bg-white/10 text-slate-100 hover:bg-white/15 dark:border-white/10 dark:bg-white/5",
                  isSidebarCollapsed && "lg:w-12",
                )}
              />
              <div className={classNames("space-y-1", isSidebarCollapsed && "lg:flex lg:flex-col lg:items-center lg:space-y-3")}>
                <div
                  className={classNames(
                    "hidden lg:flex",
                    isSidebarCollapsed && "h-12 w-12 items-center justify-center rounded-2xl bg-white text-base font-semibold text-slate-950",
                  )}
                  aria-hidden="true"
                >
                  {user.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-white">
                  <span className={classNames(isSidebarCollapsed && "lg:hidden")}>{user.name}</span>
                </p>
                <p className={classNames("text-xs text-slate-400", isSidebarCollapsed && "lg:hidden")}>
                  {user.role}
                </p>
                <p className={classNames("text-xs text-slate-500", isSidebarCollapsed && "lg:hidden")}>
                  {user.organizationName}
                </p>
              </div>
              <Button
                data-testid="logout-button"
                disabled={!isHydrated}
                loading={isLoggingOut}
                onClick={handleLogout}
                variant="secondary"
                className={classNames(
                  "border-white/10 bg-white text-slate-950 hover:bg-slate-100",
                  isSidebarCollapsed && "lg:h-12 lg:w-12 lg:rounded-2xl lg:px-0",
                )}
                title={isSidebarCollapsed ? "Logout" : undefined}
              >
                <span className={classNames(isSidebarCollapsed && "lg:hidden")}>
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </span>
                <span
                  aria-hidden="true"
                  className={classNames(
                    "hidden",
                    isSidebarCollapsed && "lg:inline-flex lg:items-center lg:justify-center",
                  )}
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
                    <path d="M8 4H5.75A1.75 1.75 0 0 0 4 5.75v8.5C4 15.216 4.784 16 5.75 16H8" />
                    <path d="M11 6l4 4-4 4" />
                    <path d="M7 10h8" />
                  </svg>
                </span>
              </Button>
            </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200/80 bg-white/80 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-[0.24em] text-sky-700 uppercase dark:text-cyan-300">
                  {sectionLabel}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                  Welcome, {user.name}
                </h1>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user.email}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.organizationName}</p>
              </div>
            </div>
          </header>
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
