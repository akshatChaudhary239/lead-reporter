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
    { name: 'Reports', href: '/dashboard/reports', icon: FileText },
    { name: 'Pricing', href: '/pricing', icon: Crown },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center amber-glow">
            <Target className="text-slate-900" size={18} />
          </div>
          <span className="font-bold tracking-tight">LeadReporter</span>
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
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                <User size={20} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user.full_name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-500 mb-1 flex justify-between">
              <span>Plan: {user.plan}</span>
              {user.plan === 'pro' && <span>{user.reports_this_month}/500 mo</span>}
              {user.plan === 'growth' && <span>{user.reports_this_month}/100 mo</span>}
              {user.plan === 'free' && <span>{user.free_reports_used}/3 free</span>}
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mb-3">
              <div 
                className="bg-amber-500 h-full transition-all duration-1000" 
                style={{ width: `${
                  user.plan === 'free' ? (user.free_reports_used / 3) * 100 :
                  user.plan === 'growth' ? (user.reports_this_month / 100) * 100 :
                  user.plan === 'pro' ? (user.reports_this_month / 500) * 100 : 0
                }%` }}
              />
            </div>
            {user.reports_purchased > 0 && (
              <div className="text-[9px] text-slate-500 uppercase font-bold mb-2">
                + {user.reports_purchased} Bonus Credits Available
              </div>
            )}
            <Link 
              href="/pricing" 
              className="block text-center text-[10px] font-bold uppercase tracking-widest py-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 transition-all border border-amber-500/20"
            >
              Upgrade Weaponry
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
          <Link href="/dashboard/new" className="btn-premium py-2 text-sm px-4">
            New Audit
          </Link>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
