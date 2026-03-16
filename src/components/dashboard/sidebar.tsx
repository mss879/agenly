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
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/usage", label: "Usage & Billing", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

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

      <nav className="flex-1 px-4 py-2 mt-4 lg:mt-8 space-y-2 flex flex-col">
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
