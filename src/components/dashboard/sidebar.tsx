"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Bot,
  BarChart3,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Settings,
  Shield,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/usage", label: "Usage & Billing", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [planName, setPlanName] = useState("");
  const [trialDays, setTrialDays] = useState<number | null>(null);
  const [subStatus, setSubStatus] = useState("");

  useEffect(() => {
    checkProfile();
    fetchPlanInfo();
  }, []);

  async function checkProfile() {
    try {
      const res = await fetch("/api/auth/profile");
      const data = await res.json();
      if (data.profile) {
        setIsAdmin(data.profile.role === "admin");
        setUserName(`${data.profile.first_name || ""} ${data.profile.last_name || ""}`.trim());
      }
    } catch {
      // ignore
    }
  }

  async function fetchPlanInfo() {
    try {
      const res = await fetch("/api/plan/current");
      const data = await res.json();
      if (data.selectedPlan) {
        setPlanName(data.selectedPlan);
        setSubStatus(data.subscriptionStatus || "");
        if (data.isTrialActive) setTrialDays(data.trialDaysRemaining);
      }
    } catch {
      // ignore
    }
  }

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Agenly Logo" width={48} height={48} className="object-contain" />
          <span className="text-xl font-bold text-white tracking-widest">AGENLY</span>
        </Link>
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
          aria-label="Close menu"
        >
          <X size={22} />
        </button>
      </div>

      {/* User greeting */}
      {userName && (
        <div className="px-6 pb-2">
          <p className="text-xs text-white/40 truncate">Hello, <span className="text-white/70 font-medium">{userName}</span></p>
        </div>
      )}

      <nav className="flex-1 px-4 py-2 mt-4 lg:mt-4 space-y-2 flex flex-col">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-medium transition-all duration-300 group ${isActive
                  ? "bg-white/[0.08] text-white border border-white/10 border-b-white/5 border-r-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                }`}
            >
              <Icon size={18} className={isActive ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-white/40 group-hover:text-white/80"} />
              {item.label}
              {isActive && <ChevronRight size={14} className="ml-auto text-white/50" />}
            </Link>
          );
        })}

        {/* Admin Panel link */}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-medium transition-all duration-300 group text-red-400/70 hover:text-red-400 hover:bg-red-500/5 mt-2 border border-red-500/10"
          >
            <Shield size={18} className="text-red-400/50 group-hover:text-red-400" />
            Admin Panel
          </Link>
        )}

        {/* Plan badge */}
        {planName && !isAdmin && (
          <div className="mt-auto pt-4">
            <Link
              href="/dashboard/billing"
              className="block px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-white/80 capitalize">{planName} Plan</span>
                {planName !== "enterprise" && (
                  <span className="text-[10px] font-semibold text-[#8B5CF6] tracking-wide">UPGRADE</span>
                )}
              </div>
              {trialDays !== null && (
                <p className="text-[10px] text-amber-400">
                  ⏳ {trialDays} day{trialDays !== 1 ? "s" : ""} left in trial
                </p>
              )}
              {subStatus === "active" && (
                <p className="text-[10px] text-emerald-400">✓ Active subscription</p>
              )}
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-all w-full duration-300"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Agenly Logo" width={36} height={36} className="object-contain" />
          <span className="text-lg font-bold text-white tracking-widest">AGENLY</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-[70]
          w-72 lg:w-64
          bg-[#0A0A0B]/95 lg:bg-white/[0.02]
          backdrop-blur-[40px]
          border-r border-white/[0.05]
          shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)]
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
