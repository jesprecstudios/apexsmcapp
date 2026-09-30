"use client";

import { useState, useEffect } from "react";
import {
  CandlestickChart,
  Layers,
  Droplets,
  Calendar,
  History,
  BookOpen,
  Zap,
  HelpCircle,
  Settings,
  Radio,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";

interface SideRailProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNewOrder?: () => void;
  onDocumentation?: () => void;
  onSettings?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  liveBadge?: boolean;
  alert?: boolean;
  notificationCount?: number;
}

export default function SideRail({
  activeTab = "charts",
  onTabChange,
  onNewOrder,
  onDocumentation,
  onSettings,
}: SideRailProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("apexsmc_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Read unread notification count from localStorage
    try {
      const raw = localStorage.getItem("apexsmc_notifications");
      if (raw) {
        const items = JSON.parse(raw);
        setUnreadCount(items.filter((n: { read: boolean }) => !n.read).length);
      } else {
        setUnreadCount(3); // Default unread for fresh sessions
      }
    } catch {
      setUnreadCount(0);
    }
  }, [activeTab]); // Re-check when tab changes

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("apexsmc_sidebar_collapsed", String(next));
      } catch {
        // noop
      }
      return next;
    });
  };

  const navItems: NavItem[] = [
    { id: "charts", label: "Charts", icon: CandlestickChart, liveBadge: true },
    { id: "smc", label: "Smart Money Tools", icon: Layers },
    { id: "heatmap", label: "Liquidity Heatmap", icon: Droplets },
    { id: "calendar", label: "Economic Calendar", icon: Calendar, alert: true },
    { id: "backtest", label: "Strategy Backtest", icon: History },
    { id: "journal", label: "Trade Journal", icon: BookOpen },
    { id: "notifications", label: "News & Fundamentals", icon: Bell, notificationCount: unreadCount },
  ];

  return (
    <aside
      className={`flex flex-col justify-between h-[calc(100vh-3.5rem)] border-r border-outline-variant bg-surface shrink-0 z-30 select-none transition-all duration-200 ease-in-out ${
        collapsed ? "w-14" : "w-14 md:w-56"
      }`}
    >
      {/* Rail Top Node Telemetry & Collapse Toggle */}
      <div className="p-2.5 border-b border-outline-variant flex items-center justify-between min-h-[49px]">
        {!collapsed && (
          <div className="hidden md:flex items-center space-x-2.5 min-w-0">
            <div className="w-6 h-6 rounded bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <Radio className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="leading-tight truncate">
              <div className="font-headline text-xs font-bold text-on-surface">Data Feed</div>
              <div className="font-mono text-[9px] text-primary">Connected (8ms)</div>
            </div>
          </div>
        )}

        <div className={`flex items-center space-x-1.5 ${collapsed ? "mx-auto" : "mx-auto md:mx-0"}`}>
          <span
            className="w-2 h-2 rounded-full bg-bullish animate-pulse shrink-0"
            title="Institutional Real Feed Active"
          />
          {/* Collapse/Expand Sidebar Toggle Button */}
          <button
            onClick={toggleCollapse}
            title={collapsed ? "Expand Sidebar (more details)" : "Collapse Sidebar (more room for chart)"}
            className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-primary" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Primary Navigation Items */}
      <div className="py-2 flex-1 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeTab;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange?.(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center py-2.5 transition-all text-left cursor-pointer ${
                collapsed ? "justify-center px-2" : "px-3"
              } ${
                isActive
                  ? "text-primary border-l-2 border-primary bg-surface-container font-semibold glow-primary-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-high border-l-2 border-transparent"
              }`}
            >
              <div className="relative shrink-0">
                <Icon className={`w-5 h-5 ${collapsed ? "" : "md:mr-3"}`} />
                {/* Notification badge on icon when collapsed or mobile */}
                {item.notificationCount && item.notificationCount > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-1.5 w-4 h-4 bg-bearish text-white text-[7px] font-bold rounded-full flex items-center justify-center ${
                      collapsed ? "" : "md:hidden"
                    }`}
                  >
                    {item.notificationCount}
                  </span>
                )}
              </div>

              {!collapsed && (
                <>
                  <span className="font-label text-xs hidden md:inline truncate flex-1">
                    {item.label}
                  </span>
                  {item.liveBadge && (
                    <span className="hidden md:inline ml-auto font-mono text-[9px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-semibold">
                      LIVE
                    </span>
                  )}
                  {item.alert && (
                    <span
                      className="hidden md:inline ml-auto w-1.5 h-1.5 bg-bearish rounded-full"
                      title="High Impact Event Today"
                    />
                  )}
                  {/* Notification count badge (expanded desktop) */}
                  {item.notificationCount && item.notificationCount > 0 && (
                    <span className="hidden md:inline ml-auto font-mono text-[9px] bg-bearish/20 text-bearish px-1.5 py-0.2 rounded font-bold">
                      {item.notificationCount}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Execution Setup CTA: New Order */}
      <div className="p-2">
        <button
          onClick={onNewOrder}
          title="New Order Setup (Ticket & Lot Size)"
          className={`w-full bg-surface-container hover:bg-surface-container-highest border border-primary/40 text-primary font-headline text-xs font-bold uppercase rounded-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer glow-primary-sm ${
            collapsed ? "py-2.5 px-0" : "py-2 px-3 space-x-2"
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span className="hidden md:inline">New Order</span>}
        </button>
      </div>

      {/* Rail Footer Links */}
      <div className="p-2 border-t border-outline-variant space-y-1">
        <button
          onClick={onDocumentation}
          title={collapsed ? "Documentation & SMC Academy" : undefined}
          className={`w-full flex items-center text-on-surface-variant hover:text-on-surface hover:bg-surface-high rounded transition-colors text-xs text-left cursor-pointer ${
            collapsed ? "justify-center p-2" : "px-3 py-2"
          }`}
        >
          <HelpCircle className={`w-4 h-4 shrink-0 ${collapsed ? "" : "md:mr-3"}`} />
          {!collapsed && <span className="font-label hidden md:inline">Documentation</span>}
        </button>
        <button
          onClick={onSettings}
          title={collapsed ? "Terminal Settings & Risk Profile" : undefined}
          className={`w-full flex items-center text-on-surface-variant hover:text-on-surface hover:bg-surface-high rounded transition-colors text-xs text-left cursor-pointer ${
            collapsed ? "justify-center p-2" : "px-3 py-2"
          }`}
        >
          <Settings className={`w-4 h-4 shrink-0 ${collapsed ? "" : "md:mr-3"}`} />
          {!collapsed && <span className="font-label hidden md:inline">Terminal Settings</span>}
        </button>
      </div>
    </aside>
  );
}
