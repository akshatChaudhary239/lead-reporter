'use client';

import { useAuth } from '@/context/AuthContext';
import { Target, LayoutDashboard, FileText, Settings, LogOut, User, Crown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  if (!user) return null; // Handled by useEffect in AuthProvider

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Opportunities', href: '/dashboard/discover', icon: Target },
    { name: 'Reports', href: '/dashboard/reports', icon: FileText },
    { name: 'Pricing', href: '/pricing', icon: Crown },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center gap-2 mb-8">
          <div className="w-8 h-8 relative flex items-center justify-center">
            {/* Using the new logo icon */}
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain amber-glow" onError={(e) => e.currentTarget.style.display = 'none'} />
            <Target className="text-amber-500" size={18} />
          </div>
          <span className="font-bold tracking-tight text-xl">GetProspectra</span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 p-4 rounded-2xl mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                <User size={20} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user.full_name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                <span className="text-slate-400">Tactical Assets</span>
                <span className="text-amber-500">{user.reports_purchased + (3 - user.free_reports_used)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                <span className="text-slate-400">Discovery Credits</span>
                <span className="text-purple-500">{user.credits}</span>
              </div>
            </div>

            <Link 
              href="/pricing" 
              className="block text-center text-[10px] font-bold uppercase tracking-widest py-3 bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10"
            >
              Buy More Credits
            </Link>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-8">
          <h2 className="text-xl font-bold">
            {navItems.find(i => i.href === pathname)?.name || 'Dashboard'}
          </h2>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
