"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { classNames } from "@/lib/class-names";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode, SVGProps } from "react";
import { useState, useSyncExternalStore } from "react";
import { logout } from "../services/inbox-service";
import { Users, UserRound, PieChart, ChevronDown, ChevronRight } from "lucide-react";

type NavigationKey = "dashboard" | "customers" | "segments" | "inbox" | "publishing" | "integrations" | "team" | "settings";

type NavigationItem = {
  href: string;
  key: NavigationKey;
  labelKey?: string;
  icon: React.ElementType;
  children?: NavigationItem[];
};

type AuthenticatedShellProps = {
  activeNavigation: NavigationKey;
  children: ReactNode;
  sectionLabel: string;
  user: {
    email: string;
    name: string;
    organizationName: string;
    role: string;
  };
};

function SidebarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

const navigationItems: NavigationItem[] = [
  {
    href: "/dashboard",
    key: "dashboard",
    icon: (props: SVGProps<SVGSVGElement>) => (
      <SidebarIcon {...props}>
        <path d="M3.5 10.5 10 4l6.5 6.5" />
        <path d="M5.5 9.5v6h9v-6" />
      </SidebarIcon>
    ),
  },
  {
    href: "/inbox",
    key: "inbox",
    icon: (props: SVGProps<SVGSVGElement>) => (
      <SidebarIcon {...props}>
        <path d="M4 5.5h12v9H4z" />
        <path d="M4 11h3l1.5 2h3L13 11h3" />
      </SidebarIcon>
    ),
  },
  {
    href: "/publishing",
    key: "publishing",
    icon: (props: SVGProps<SVGSVGElement>) => (
      <SidebarIcon {...props}>
        <path d="M4.5 14.5 15.5 5.5" />
        <path d="m8 5 7 1-1 7" />
        <path d="M5 15h3" />
      </SidebarIcon>
    ),
  },
  {
    href: "/integrations",
    key: "integrations",
    icon: (props: SVGProps<SVGSVGElement>) => (
      <SidebarIcon {...props}>
        <path d="M7 7.5 4.75 9.75a2.5 2.5 0 0 0 3.536 3.536L10.5 11" />
        <path d="m13 12.5 2.25-2.25a2.5 2.5 0 1 0-3.536-3.536L9.5 9" />
      </SidebarIcon>
    ),
  },
  {
    href: "/customers",
    key: "customers",
    icon: Users,
    children: [
      {
        href: "/customers",
        key: "customers",
        labelKey: "allCustomers",
        icon: UserRound,
      },
      {
        href: "/segments",
        key: "segments",
        icon: PieChart,
      },
    ],
  },
  {
    href: "/team",
    key: "team",
    icon: (props: SVGProps<SVGSVGElement>) => (
      <SidebarIcon {...props}>
        <path d="M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M13.5 10a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z" />
        <path d="M3.75 15c.5-1.75 1.9-2.75 3.95-2.75 1.1 0 2.05.3 2.8.89" />
        <path d="M10.9 15c.38-1.2 1.42-1.9 2.8-1.9 1.38 0 2.42.7 2.8 1.9" />
      </SidebarIcon>
    ),
  },
  {
    href: "/settings",
    key: "settings",
    icon: (props: SVGProps<SVGSVGElement>) => (
      <SidebarIcon {...props}>
        <path d="M10 7.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z" />
        <path d="M10 3.75v1.5" />
        <path d="M10 14.75v1.5" />
        <path d="m5.58 5.58 1.06 1.06" />
        <path d="m13.36 13.36 1.06 1.06" />
        <path d="M3.75 10h1.5" />
        <path d="M14.75 10h1.5" />
        <path d="m5.58 14.42 1.06-1.06" />
        <path d="m13.36 6.64 1.06-1.06" />
      </SidebarIcon>
    ),
  },
];

export function AuthenticatedShell({
  activeNavigation,
  children,
  user,
}: AuthenticatedShellProps) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navigationItems.forEach((item) => {
      if (item.children?.some((child) => child.key === activeNavigation)) {
        initial[item.key] = true;
      }
    });
    return initial;
  });

  const toggleMenu = (key: string) => {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };
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
          data-testid="authenticated-sidebar"
          className={classNames(
            "border-b border-slate-200/80 bg-slate-950 text-slate-100 transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:shrink-0 lg:self-start lg:flex-col lg:overflow-hidden lg:border-b-0 lg:border-r lg:border-slate-800 dark:border-slate-800 dark:bg-slate-950",
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
                <p className="text-xs text-slate-400">{tNav("operatorWorkspace")}</p>
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
                aria-label={isSidebarCollapsed ? tNav("expand") : tNav("collapse")}
              >
                <span className="sr-only">
                  {isSidebarCollapsed ? tNav("expand") : tNav("collapse")}
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
                {isMenuOpen ? t("close") : t("menu")}
              </button>
            </div>
          </div>

          <div
            id="mobile-sidebar"
            className={classNames(
              "hidden border-t border-slate-800 px-4 pb-5 lg:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:border-t-0 lg:px-5",
              isMenuOpen && "block",
            )}
          >
            <div className="flex h-full flex-col">
            <nav className="space-y-2 py-4">
              {navigationItems.map((item) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const label = tNav((item.labelKey || item.key) as any);
                const isParentActive = item.key === activeNavigation || item.children?.some((c) => c.key === activeNavigation);
                const isExpanded = expandedMenus[item.key];

                return (
                  <div key={item.key}>
                    {item.children ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (isSidebarCollapsed && window.innerWidth >= 1024) {
                            setIsSidebarCollapsed(false);
                            setExpandedMenus((prev) => ({ ...prev, [item.key]: true }));
                          } else {
                            toggleMenu(item.key);
                          }
                        }}
                        aria-expanded={isExpanded}
                        title={isSidebarCollapsed ? label : undefined}
                        className={classNames(
                          "flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950",
                          isSidebarCollapsed ? "justify-center lg:px-3" : "justify-between gap-3",
                          isParentActive && !isExpanded && isSidebarCollapsed
                            ? "bg-cyan-400 text-slate-950"
                            : isParentActive
                              ? "bg-cyan-400/5 text-cyan-300"
                              : "text-slate-300 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                          <span className={classNames(isSidebarCollapsed && "lg:hidden")}>{label}</span>
                        </span>
                        {!isSidebarCollapsed && (
                          <span className="shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        aria-current={activeNavigation === item.key ? "page" : undefined}
                        title={isSidebarCollapsed ? label : undefined}
                        className={classNames(
                          "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950",
                          isSidebarCollapsed ? "justify-center lg:px-3" : "justify-between gap-3",
                          activeNavigation === item.key
                            ? "bg-cyan-400 text-slate-950"
                            : "bg-white/5 text-slate-300 hover:bg-white/10",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                          <span className={classNames(isSidebarCollapsed && "lg:hidden")}>{label}</span>
                        </span>
                        {!isSidebarCollapsed && activeNavigation === item.key ? (
                          <span className="rounded-full bg-slate-950/10 px-2 py-1 text-[11px]">
                            {t("open")}
                          </span>
                        ) : null}
                      </Link>
                    )}

                    {item.children && (!isSidebarCollapsed || isMenuOpen) && isExpanded && (
                      <div className="mt-1 space-y-1 pl-4 lg:pl-5">
                        {item.children.map((child) => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const childLabel = tNav((child.labelKey || child.key) as any);
                          const isChildActive = activeNavigation === child.key;
                          return (
                            <Link
                              key={child.key}
                              href={child.href}
                              aria-current={isChildActive ? "page" : undefined}
                              className={classNames(
                                "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950",
                                isChildActive
                                  ? "bg-cyan-400/10 text-cyan-400"
                                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                              )}
                            >
                              <child.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                              <span className="truncate">{childLabel}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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
                title={isSidebarCollapsed ? t("logout") : undefined}
              >
                <span className={classNames(isSidebarCollapsed && "lg:hidden")}>
                  {isLoggingOut ? t("loading") : t("logout")}
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
                  {tNav(activeNavigation)}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                  {tNav("welcome", { name: user.name })}
                </h1>
              </div>
              <div className="flex items-center gap-3 text-right">
                <LanguageSwitcher />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user.email}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.organizationName}</p>
                </div>
              </div>
            </div>
          </header>
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
