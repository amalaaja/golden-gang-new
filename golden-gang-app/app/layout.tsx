import type { Metadata } from "next";
import "./globals.css";
import { GangProvider } from "@/lib/GangContext";
import AuthGuard from "@/app/components/AuthGuard";
import Sidebar from "@/app/components/Sidebar";
import ClientErrorBoundary from "@/app/components/ClientErrorBoundary";

export const metadata: Metadata = {
  title: "Golden Gang - Syndicate System",
  description: "Internal Syndicate Network and Asset Management",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-[#050505] text-white selection:bg-[#D4AF37]/30 selection:text-[#F3E5AB]">
        <GangProvider>
          <AuthGuard>
            <div className="flex flex-col lg:flex-row h-screen bg-[#050505] font-sans overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#100d07] via-[#050505] to-[#050505] custom-scrollbar">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] bg-red-900/5 blur-[120px] rounded-full pointer-events-none z-0"></div>
                <div className="relative z-10 w-full max-w-[1600px] mx-auto min-h-full flex flex-col justify-between">
                  <ClientErrorBoundary>
                    {children}
                  </ClientErrorBoundary>
                  <footer className="mt-12 py-4 border-t border-white/5 text-center text-xs text-gray-500 font-medium tracking-wider">
                    Created By <span className="text-amber-400 font-bold tracking-widest">AMALA</span>
                  </footer>
                </div>
              </main>
            </div>
          </AuthGuard>
        </GangProvider>
      </body>
    </html>
  );
}
