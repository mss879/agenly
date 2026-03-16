import Sidebar from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white relative overflow-hidden">
      {/* Ultra-premium Deep Space Ambient Glow Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#7C3AED]/30 rounded-full blur-[160px] pointer-events-none mix-blend-screen" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#8B5CF6]/20 rounded-full blur-[160px] pointer-events-none mix-blend-screen" />
      <div className="fixed top-[40%] left-[30%] w-[40%] h-[40%] bg-[#EC4899]/10 rounded-full blur-[140px] pointer-events-none mix-blend-screen" />
      
      <div className="relative z-10 flex">
        <Sidebar />
        <main className="w-full lg:ml-64 pt-20 lg:pt-6 px-4 py-6 sm:p-6 lg:p-8 flex-1 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
