'use client';

import { motion } from 'framer-motion';
import { Target, Zap, Shield, BarChart3, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0f172a] text-white overflow-hidden">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
            <Target className="text-amber-500" size={24} />
          </div>
          <span className="text-2xl font-black tracking-tighter">Get<span className="text-amber-500">Prospectra</span></span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium hover:text-amber-500 transition-colors">Login</Link>
          <Link href="/register" className="btn-premium py-2 text-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-wider mb-6">
            The Ultimate Client-Closing Weapon
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Turn Cold Leads into <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              Closed Clients
            </span>
          </h1>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Generate professional, data-driven audit reports that reveal your prospect's weaknesses and prove your value in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-premium w-full sm:w-auto flex items-center justify-center gap-2">
              Start Your First Audit <ChevronRight size={20} />
            </Link>
            <button className="w-full sm:w-auto px-8 py-3 rounded-full border border-slate-700 hover:bg-slate-800 transition-all font-medium">
              View Sample Report
            </button>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8 mt-32"
        >
          <div className="glass-card p-8 text-left hover:border-amber-500/30 transition-all group">
            <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="text-amber-500" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Orchestrate scraping, competitor discovery, and AI analysis in under 60 seconds.
            </p>
          </div>

          <div className="glass-card p-8 text-left hover:border-amber-500/30 transition-all group">
            <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Shield className="text-amber-500" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Professional PDF</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Beautifully designed audit reports ready to be sent directly to your prospects.
            </p>
          </div>

          <div className="glass-card p-8 text-left hover:border-amber-500/30 transition-all group">
            <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="text-amber-500" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Competitive Intelligence</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Deep-dive into local competitors to show your prospects exactly where they're falling behind.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="font-black tracking-tighter text-lg text-slate-300">Get<span className="text-amber-500">Prospectra</span></span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 Antigravity Systems. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
