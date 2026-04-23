'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      });
      login(res.data.access_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-lg p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center amber-glow mb-4">
            <Target className="text-slate-900" size={28} />
          </div>
          <h1 className="text-2xl font-bold">Join the Arsenal</h1>
          <p className="text-slate-400 text-sm text-center">Get ready to generate high-converting audit reports</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
              <input 
                type="text" 
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-premium w-full flex items-center justify-center gap-2 mt-6"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Create Account <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="hidden md:block space-y-6 border-l border-slate-800 pl-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">What you get:</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-amber-500 shrink-0" size={18} />
                <span className="text-sm text-slate-300">5 Free high-converting audit reports per month</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-amber-500 shrink-0" size={18} />
                <span className="text-sm text-slate-300">Deep local competitor discovery engine</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-amber-500 shrink-0" size={18} />
                <span className="text-sm text-slate-300">AI-powered SEO & conversion analysis</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-amber-500 shrink-0" size={18} />
                <span className="text-sm text-slate-300">Professional PDF generation & downloads</span>
              </li>
            </ul>
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          Already a member? <Link href="/login" className="text-amber-500 hover:underline font-medium">Login here</Link>
        </p>
      </motion.div>
    </main>
  );
}
