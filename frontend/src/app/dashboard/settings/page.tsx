'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Palette, Check, Sun, Moon, Zap, Shield, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

const themes = [
  { id: 'default', name: 'Midnight', desc: 'Classic Navy & Amber', icon: Moon, colors: ['bg-[#0f172a]', 'bg-[#f59e0b]'] },
  { id: 'emerald', name: 'Emerald', desc: 'Growth & Prosperity', icon: Zap, colors: ['bg-[#064e3b]', 'bg-[#10b981]'] },
  { id: 'crimson', name: 'Crimson', desc: 'Aggressive Acquisition', icon: Shield, colors: ['bg-[#450a0a]', 'bg-[#ef4444]'] },
  { id: 'royal', name: 'Royal', desc: 'Elite Intelligence', icon: Crown, colors: ['bg-[#2e1065]', 'bg-[#a855f7]'] },
];

export default function SettingsPage() {
  const [currentTheme, setCurrentTheme] = useState('default');

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'default';
    setCurrentTheme(savedTheme);
  }, []);

  const changeTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('app-theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-12">
        {/* Appearance Section */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Palette className="text-amber-500" size={24} />
            <h2 className="text-xl font-bold">Appearance & Branding</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {themes.map((theme) => {
              const Icon = theme.icon;
              const isActive = currentTheme === theme.id;
              
              return (
                <button
                  key={theme.id}
                  onClick={() => changeTheme(theme.id)}
                  className={`glass-card p-6 text-left transition-all relative overflow-hidden group ${
                    isActive ? 'border-amber-500 shadow-2xl shadow-amber-500/10' : 'hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-amber-500 text-slate-900' : 'bg-slate-800'}`}>
                        <Icon size={20} />
                      </div>
                      <span className="font-bold">{theme.name}</span>
                    </div>
                    {isActive && (
                      <div className="bg-amber-500 text-slate-900 rounded-full p-1">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-400 mb-6">{theme.desc}</p>
                  
                  <div className="flex gap-2">
                    {theme.colors.map((c, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full border border-white/10 ${c}`} />
                    ))}
                  </div>

                  {/* Hover Accent */}
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-5 transition-opacity group-hover:opacity-10 ${
                    theme.id === 'default' ? 'from-amber-500 to-transparent' :
                    theme.id === 'emerald' ? 'from-emerald-500 to-transparent' :
                    theme.id === 'crimson' ? 'from-red-500 to-transparent' :
                    'from-purple-500 to-transparent'
                  }`} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Report Customization (Placeholder) */}
        <section className="glass-card p-8 border-dashed border-slate-700 opacity-60">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-slate-500" size={24} />
            <h2 className="text-xl font-bold text-slate-500">White-Labeling (Coming Soon)</h2>
          </div>
          <p className="text-sm text-slate-500 max-w-xl">
            Custom logos, dedicated subdomains, and private report themes will be available for Enterprise users.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}
