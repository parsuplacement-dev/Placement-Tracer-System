"use client";

import { useEffect, useState, useTransition, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuUserRoundSearch,
  LuHouse,
  LuSettings2,
  LuFileSpreadsheet,
  LuUsersRound,
  LuCalendarClock,
  LuFolderOpen,
  LuEllipsis,
} from "@/components/ui/icons";
import { Role, ROLES } from "@/types";
import Modal from "@/components/ui/Modal";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { IconLink as Link } from "@/components/ui/icon-link";

interface DashboardNavigationProps {
  role: Role;
}

export default function DashboardNavigation({
  role,
}: DashboardNavigationProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isNavigationPending, startNavigation] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const mediumViewport = window.matchMedia("(min-width: 48rem)");
    const dismissMoreMenu = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) setShowMoreMenu(false);
    };

    dismissMoreMenu(mediumViewport);
    mediumViewport.addEventListener("change", dismissMoreMenu);

    return () => mediumViewport.removeEventListener("change", dismissMoreMenu);
  }, []);

  function markNavigationPending(
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      href === pathname
    ) {
      return;
    }

    event.preventDefault();
    setPendingHref(href);
    startNavigation(() => router.push(href));
  }

  const adminNavItems = [
    {
      label: "Home",
      href: "/admin",
      icon: LuHouse,
    },
    {
      label: "Responses",
      href: "/admin/responses",
      icon: LuFileSpreadsheet,
    },
    {
      label: "Studies",
      href: "/admin/studies",
      icon: LuCalendarClock,
    },
    {
      label: "Accounts",
      href: "/admin/accounts",
      icon: LuUsersRound,
    },
    {
      label: "Files",
      href: "/admin/files",
      icon: LuFolderOpen,
    },
  ];

  const alumniNavItems = [
    {
      label: "Dashboard",
      href: "/alumni",
      icon: LuHouse,
    },
    {
      label: "Responses",
      href: "/alumni/responses",
      icon: LuFileSpreadsheet,
    },
  ];

  const coordinatorNavItems = adminNavItems.slice(0, 2);
  const isAdministrativePortal = role !== ROLES.ALUMNI;
  const roleNavItems =
    role === ROLES.ADMIN
      ? adminNavItems
      : role === ROLES.COORDINATOR
        ? coordinatorNavItems
        : alumniNavItems;

  const secondaryNavItems = isAdministrativePortal
    ? [
        {
          label: "Settings",
          href: "/admin/settings",
          icon: LuSettings2,
        },
      ]
    : [
        {
          label: "Settings",
          href: "/alumni/settings",
          icon: LuSettings2,
        },
      ];

  const mainNavItems = roleNavItems;
  const desktopNavSections =
    role === ROLES.ADMIN
      ? [
          { label: "Overview", items: adminNavItems.slice(0, 1) },
          { label: "Tracer study", items: adminNavItems.slice(1, 3) },
          { label: "Administration", items: adminNavItems.slice(3) },
        ]
      : role === ROLES.COORDINATOR
        ? [
            { label: "Overview", items: coordinatorNavItems.slice(0, 1) },
            {
              label: "Tracer study",
              items: coordinatorNavItems.slice(1),
            },
          ]
        : [
            { label: "Overview", items: alumniNavItems.slice(0, 1) },
            { label: "Tracer study", items: alumniNavItems.slice(1) },
          ];
  const mobilePrimaryItems =
    role === ROLES.ADMIN ? adminNavItems.slice(0, 3) : roleNavItems;
  const mobileMoreItems =
    role === ROLES.ADMIN
      ? [...adminNavItems.slice(3), ...secondaryNavItems]
      : secondaryNavItems;

  const isActiveLink = (href: string) => {
    const allNavItems = [...mainNavItems, ...secondaryNavItems].map(
      (item) => item.href,
    );

    const matchedRoute = allNavItems
      .filter((route) => pathname === route || pathname.startsWith(`${route}/`))
      .sort((a, b) => b.length - a.length)[0];

    return matchedRoute === href;
  };
  const isMoreActive = mobileMoreItems.some((item) => isActiveLink(item.href));

  return (
    <>
      <aside
        className={`fixed z-10 hidden h-svh flex-col overflow-x-hidden border-r border-border bg-card px-2.5 py-4 text-foreground shadow-xl  transition-[width] duration-300 ease-out md:flex ${
          isOpen ? "w-66 max-w-5/6" : "w-18"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center px-3">
          <LuUserRoundSearch size={26} className="shrink-0" />

          <h1
            className={`overflow-hidden whitespace-nowrap text-xl font-semibold tracking-tight transition-[max-width,margin,opacity,transform] duration-300 ease-out ${
              isOpen
                ? "ml-3 max-w-40 translate-x-0 opacity-100"
                : "ml-0 max-w-0 -translate-x-1 opacity-0"
            }`}
          >
            Tracer
          </h1>
        </div>

        <div className="my-3 shrink-0 border-t border-border" />

        <nav
          aria-label="Dashboard"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden"
        >
          {desktopNavSections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              <p
                className={`h-5 cursor-default select-none whitespace-nowrap px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-opacity duration-200 ${
                  isOpen ? "opacity-100" : "opacity-0"
                }`}
              >
                {section.label}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    data-nav-control
                    href={item.href}
                    prefetch={!isActiveLink(item.href)}
                    title={isOpen ? undefined : item.label}
                    aria-label={item.label}
                    onClick={(event) => markNavigationPending(event, item.href)}
                    className={`relative flex h-10 items-center rounded-xl px-4 outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring ${
                      isActiveLink(item.href)
                        ? "bg-primary/10 text-nav-active"
                        : "text-nav-inactive hover:bg-primary/10 hover:text-nav-active"
                    }`}
                  >
                    <Icon size={19} className="shrink-0" />
                    <span
                      className={`block overflow-hidden whitespace-nowrap text-sm font-medium transition-[max-width,margin,opacity,transform] duration-300 ease-out ${
                        isOpen
                          ? "ml-3 max-w-40 translate-x-0 opacity-100"
                          : "ml-0 max-w-0 -translate-x-1 opacity-0"
                      }`}
                    >
                      {item.label}
                    </span>
                    {isNavigationPending && pendingHref === item.href && (
                      <span
                        aria-label={`Opening ${item.label}`}
                        className="absolute right-3 h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-3 flex shrink-0 flex-col gap-1 border-t border-border pt-3">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                data-nav-control
                href={item.href}
                prefetch={!isActiveLink(item.href)}
                onClick={(event) => markNavigationPending(event, item.href)}
                title={isOpen ? undefined : item.label}
                aria-label={item.label}
                className={`${buttonVariants({
                  variant: isActiveLink(item.href)
                    ? "navigation-active"
                    : "navigation",
                  size: "sidebar",
                })} relative`}
              >
                <Icon size={19} className="-ml-0.5 shrink-0" />

                <span
                  className={`block overflow-hidden whitespace-nowrap text-sm font-medium transition-[max-width,margin,opacity,transform] duration-300 ease-out ${
                    isOpen
                      ? "ml-3 max-w-40 translate-x-0 opacity-100"
                      : "ml-0 max-w-0 -translate-x-1 opacity-0"
                  }`}
                >
                  {item.label}
                </span>
                {isNavigationPending && pendingHref === item.href && (
                  <span
                    aria-label={`Opening ${item.label}`}
                    className="absolute right-3 h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
          <ThemeToggle expanded={isOpen} />
          <Button
            type="button"
            data-nav-control
            variant="navigation"
            size="sidebar"
            onClick={() => setIsOpen((open) => !open)}
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <LuPanelLeftClose size={19} className="-ml-0.5 shrink-0" />
            ) : (
              <LuPanelLeftOpen size={19} className="-ml-0.5 shrink-0" />
            )}
            <span
              className={`block overflow-hidden whitespace-nowrap text-sm font-medium transition-[max-width,margin,opacity,transform] duration-300 ease-out ${
                isOpen
                  ? "ml-3 max-w-40 translate-x-0 opacity-100"
                  : "ml-0 max-w-0 -translate-x-1 opacity-0"
              }`}
            >
              Collapse sidebar
            </span>
          </Button>
        </div>
      </aside>

      <div
        className={`hidden shrink-0 md:block transition-[width] duration-300 ${
          isOpen ? "w-66" : "w-18"
        }`}
      />

      <nav className="fixed bottom-0 left-0 right-0 z-50 rounded-t-4xl border border-b-0 border-border bg-background p-2 [padding-bottom:calc(0.5rem+env(safe-area-inset-bottom))] text-foreground shadow-xl md:hidden">
        <div className="flex justify-around [&>*:first-child]:rounded-tl-3xl [&>*:last-child]:rounded-tr-3xl">
          {mobilePrimaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveLink(item.href);

            return (
              <Link
                key={item.href}
                data-nav-control
                href={item.href}
                prefetch={!active}
                onClick={(event) => markNavigationPending(event, item.href)}
                className={`${buttonVariants({
                  variant: "plain",
                  size: "mobile-nav",
                })} group relative hover:text-nav-active ${
                  active ? "text-nav-active" : "text-nav-inactive"
                }`}
              >
                <Icon size={24} />

                <span className="text-xs leading-none font-medium">
                  {item.label}
                </span>

                <div
                  className={`absolute top-1.5 -z-10 h-7.5 w-full max-w-16 rounded-full ${
                    active
                      ? "bg-accent/25 dark:bg-accent/15"
                      : "group-hover:bg-primary/10"
                  }`}
                />
                {isNavigationPending && pendingHref === item.href && (
                  <span
                    aria-label={`Opening ${item.label}`}
                    className="absolute right-2 top-1.5 h-2 w-2 animate-pulse rounded-full bg-accent"
                  />
                )}
              </Link>
            );
          })}
          <Button
            type="button"
            data-nav-control
            variant="plain"
            size="mobile-nav"
            aria-haspopup="dialog"
            aria-expanded={showMoreMenu}
            onClick={() => setShowMoreMenu(true)}
            className={`group relative hover:text-nav-active ${
              isMoreActive ? "text-nav-active" : "text-nav-inactive"
            }`}
          >
            <LuEllipsis aria-hidden="true" className="size-6" />
            <span className="text-xs leading-none font-medium">More</span>
            <span
              className={`absolute top-1.5 -z-10 h-7.5 w-full max-w-16 rounded-full ${
                isMoreActive
                  ? "bg-accent/25 dark:bg-accent/15"
                  : "group-hover:bg-primary/10"
              }`}
            />
          </Button>
        </div>
      </nav>

      <Modal
        open={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        title="More"
        description="Additional pages and display settings"
        width="sm"
        fitContent
        placement="bottom"
        preserveScrollbarGutter={false}
      >
        <nav aria-label="More pages" className="grid gap-2">
          {mobileMoreItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveLink(item.href);

            return (
              <Link
                key={item.href}
                data-nav-control
                href={item.href}
                prefetch={!active}
                onClick={(event) => {
                  setShowMoreMenu(false);
                  markNavigationPending(event, item.href);
                }}
                className={`${buttonVariants({
                  variant: active ? "navigation-active" : "navigation",
                  size: "theme-menu",
                })} relative rounded-2xl`}
              >
                <Icon aria-hidden="true" size={22} />
                {item.label}
                {isNavigationPending && pendingHref === item.href && (
                  <span
                    aria-label={`Opening ${item.label}`}
                    className="absolute right-4 h-2 w-2 animate-pulse rounded-full bg-accent"
                  />
                )}
              </Link>
            );
          })}
          <div className="mt-1 border-t border-border pt-2">
            <ThemeToggle placement="menu" />
          </div>
        </nav>
      </Modal>
    </>
  );
}
