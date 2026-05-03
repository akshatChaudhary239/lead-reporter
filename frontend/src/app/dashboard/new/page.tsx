'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ArrowRight, Loader2, Info, CheckCircle2, Globe, Search, BrainCircuit } from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function NewAuditPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    business_name: '',
    website_url: '',
    business_type: '',
    location_hint: '',
  });
  const [loading_submit, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!loading && !user?.is_admin) {
    router.replace('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/reports/', formData);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to trigger audit. Please check your inputs.');
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto pt-10">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-extrabold mb-4">Weapon Trigger</h1>
          <p className="text-slate-400">Initialize the orchestration sequence for your next target.</p>
        </div>

        <div className="glass-card p-8 md:p-12 relative overflow-hidden">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
            <motion.div 
              className="h-full bg-amber-500 amber-glow" 
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 2) * 100}%` }}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 text-amber-500 mb-2">
                    <Globe size={20} />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Primary Target Data</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Business Name</label>
                      <input 
                        type="text" 
                        required
                        value={formData.business_name}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                        placeholder="e.g. Example Dental"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Website URL</label>
                      <input 
                        type="url" 
                        required
                        value={formData.website_url}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button 
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!formData.business_name || !formData.website_url}
                      className="btn-premium flex items-center gap-2"
                    >
                      Next Step <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 text-amber-500 mb-2">
                    <Search size={20} />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Intelligence Context</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Business Type (Optional)</label>
                      <input 
                        type="text" 
                        value={formData.business_type}
                        onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                        placeholder="e.g. Dentist, Lawyer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location Hint (Optional)</label>
                      <input 
                        type="text" 
                        value={formData.location_hint}
                        onChange={(e) => setFormData({ ...formData, location_hint: e.target.value })}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                        placeholder="e.g. Austin, TX"
                      />
                    </div>
                  </div>

                  <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-3 mt-4">
                    <Info className="text-amber-500 shrink-0" size={18} />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Providing location and business type helps our discovery engine find the most relevant local competitors for a more aggressive audit.
                    </p>
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <div className="flex justify-between items-center pt-4">
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm font-bold text-slate-500 hover:text-white transition-colors"
                    >
                      Go Back
                    </button>
                    <button 
                      type="submit"
                      disabled={loading_submit}
                      className="btn-premium flex items-center gap-3"
                    >
                      {loading_submit ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <>Initialize Audit <Target size={18} /></>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Process Visualization */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
          <div className="flex flex-col items-center text-center opacity-40">
            <Globe className="mb-3" />
            <span className="text-[10px] uppercase font-bold tracking-tighter">Scraping Data</span>
          </div>
          <div className="flex flex-col items-center text-center opacity-40">
            <Search className="mb-3" />
            <span className="text-[10px] uppercase font-bold tracking-tighter">Competitor Intel</span>
          </div>
          <div className="flex flex-col items-center text-center opacity-40">
            <BrainCircuit className="mb-3" />
            <span className="text-[10px] uppercase font-bold tracking-tighter">AI Analysis</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
