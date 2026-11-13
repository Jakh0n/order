"use client";

import { ChevronDown, ExternalLink, Gem, LogOut } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  CHANNELS,
  MARKETING,
  type NavItem,
  SETTINGS,
  STORE,
  useActive,
} from "@/components/admin/admin-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

// Brand tint for the current page instead of the sidebar's grey accent
const ACTIVE = "data-active:bg-primary/10 data-active:text-primary data-active:font-semibold";

/**
 * Desktop admin sidebar (shadcn Sidebar, collapsible to icons; ⌘/Ctrl+B or the rail).
 * Phones keep the bottom tab bar (AdminNav variant="bottom").
 * Server-rendered bits (store switch, plan, language) come in as props.
 */
export function AdminSidebar({
  storeName,
  storeSlug,
  openToggle,
  plan,
  language,
}: {
  storeName: string;
  storeSlug: string;
  openToggle: React.ReactNode;
  plan: { label: string; hint: string; pro: boolean };
  language: React.ReactNode;
}) {
  const t = useTranslations("admin");
  const isActive = useActive();

  const menu = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <NavEntry key={item.href} item={item} isActive={isActive} />
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="hidden md:flex">
      <SidebarHeader className="gap-3 pt-3">
        {/* Store identity: who you are managing + its public page */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={storeName}
              render={<Link href={`/${storeSlug}`} target="_blank" />}
            >
              <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
                {storeName.charAt(0).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{storeName}</span>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  {t("viewStore")}
                  <ExternalLink className="size-3" aria-hidden />
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="group-data-[collapsible=icon]:hidden">{openToggle}</div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>{menu(STORE)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("salesChannels")}</SidebarGroupLabel>
          <SidebarGroupContent>{menu(CHANNELS)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("marketing")}</SidebarGroupLabel>
          <SidebarGroupContent>{menu(MARKETING)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Pinned bottom: configuration + plan + account, away from daily work */}
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <NavEntry item={SETTINGS} isActive={isActive} />
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={plan.label}
              isActive={isActive("/admin/plan")}
              // Two lines when open (lg); collapsed it must line up with the other icons
              className={cn(ACTIVE, "group-data-[collapsible=icon]:p-2!")}
              render={<Link href="/admin/plan" />}
            >
              <Gem className={cn(plan.pro ? "text-primary" : "text-muted-foreground")} />
              <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="font-medium">{plan.label}</span>
                <span className="text-muted-foreground truncate text-xs">{plan.hint}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logout}>
              <SidebarMenuButton
                type="submit"
                tooltip={t("logout")}
                className="text-muted-foreground"
              >
                <LogOut />
                <span>{t("logout")}</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-1 group-data-[collapsible=icon]:hidden">{language}</div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function NavEntry({ item, isActive }: { item: NavItem; isActive: (href: string) => boolean }) {
  const t = useTranslations("admin");
  const { state } = useSidebar();
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  const label = t(item.key);

  if (!item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={label}
          isActive={isActive(item.href)}
          className={ACTIVE}
          render={<Link href={item.href} />}
        >
          <Icon />
          <span>{label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Website: sub-pages. Collapsed to icons → the icon opens the first page.
  const inside = item.children.some((c) => isActive(c.href));
  if (state === "collapsed") {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={label}
          isActive={inside}
          className={ACTIVE}
          render={<Link href={item.children[0].href} />}
        >
          <Icon />
          <span>{label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const expanded = open || inside;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
        className={cn(inside && "text-primary")}
      >
        <Icon />
        <span>{label}</span>
        <ChevronDown
          className={cn("ml-auto opacity-60 transition-transform", !expanded && "-rotate-90")}
        />
      </SidebarMenuButton>
      {expanded && (
        <SidebarMenuSub>
          {item.children.map((child) => (
            <SidebarMenuSubItem key={child.href}>
              <SidebarMenuSubButton
                isActive={isActive(child.href)}
                className="data-active:bg-primary/10 data-active:text-primary data-active:font-medium"
                render={<Link href={child.href} />}
              >
                <span>{t(`websiteItems.${child.key}`)}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}
