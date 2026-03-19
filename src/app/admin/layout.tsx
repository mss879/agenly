"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, ClipboardList, LogOut, ChevronRight, Bot, ArrowLeft,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/signups", label: "Signup Data", icon: ClipboardList },
  { href: "/dashboard", label: "Agent Platform", icon: Bot },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const res = await fetch("/api/auth/profile");
    const data = await res.json();
    if (!data.profile || data.profile.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    setIsAdmin(true);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#7C3AED] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#DC2626]/10 rounded-full blur-[160px] pointer-events-none mix-blend-screen" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#7C3AED]/15 rounded-full blur-[160px] pointer-events-none mix-blend-screen" />

      <div className="relative z-10 flex">
        {/* Admin Sidebar */}
        <aside className="fixed top-0 left-0 h-screen w-64 bg-white/[0.02] backdrop-blur-[40px] border-r border-white/[0.05] shadow-[4px_0_24px_-12px_rgba(0,0,0,0.5)] flex flex-col">
          {/* Logo */}
          <div className="p-6">
            <Link href="/admin" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Agenly Logo" width={40} height={40} className="object-contain" />
              <div>
                <span className="text-lg font-bold text-white tracking-widest">AGENLY</span>
                <span className="block text-[10px] font-bold tracking-[0.3em] text-red-400 uppercase">Admin Panel</span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-2 mt-4 space-y-1.5 flex flex-col">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href) && item.href !== "/admin";
              const Icon = item.icon;
              const isExternal = item.href === "/dashboard";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                    isActive
                      ? "bg-white/[0.08] text-white border border-white/10"
                      : isExternal
                      ? "text-[#8B5CF6]/60 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/5"
                      : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-white" : isExternal ? "text-[#8B5CF6]/50" : "text-white/40"} />
                  {item.label}
                  {isActive && <ChevronRight size={14} className="ml-auto text-white/50" />}
                  {isExternal && <ArrowLeft size={14} className="ml-auto text-[#8B5CF6]/30 rotate-180" />}
                </Link>
              );
            })}
          </nav>

          <div className="p-4">
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-all w-full">
              <LogOut size={18} /> Sign out
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="ml-64 p-8 flex-1 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
