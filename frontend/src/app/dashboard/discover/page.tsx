'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Search, MapPin, Target, Zap, Lock, Unlock, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface PublicLead {
  id: string;
  business_name: string;
  category: string;
  location: string;
  opportunity_score: string;
  teaser_insight: string;
  teaser_revenue_leak?: string;
  created_at: string;
  updated_at: string;
  is_unlocked: boolean;
}

export default function DiscoverPage() {
  const { user, refreshUser } = useAuth();
  const [leads, setLeads] = useState<PublicLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<PublicLead | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/discover', {
        params: { page, size: 12, category, location }
      });
      setLeads(res.data.leads);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to fetch leads', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, category, location]);

  const handleUnlockConfirm = async () => {
    if (!selectedLead) return;
    
    setUnlockingId(selectedLead.id);
    try {
      await api.post(`/discover/${selectedLead.id}/unlock`);
      await refreshUser();
      // Refresh local lead state
      setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, is_unlocked: true } : l));
      setShowUnlockModal(false);
      setSelectedLead(null);
    } catch (err: any) {
      console.error('Unlock failed', err);
      // We could add an inline error message in the modal here
    } finally {
      setUnlockingId(null);
    }
  };

  const openUnlockModal = (lead: PublicLead) => {
    setSelectedLead(lead);
    setShowUnlockModal(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              Lead Discovery
            </h1>
            <p className="text-slate-400 mt-2">Ready-to-close opportunities curated by AI.</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/50 border border-purple-500/30 p-3 rounded-xl backdrop-blur-sm">
            <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="font-semibold text-lg">{user?.credits || 0}</span>
            <span className="text-sm text-slate-400 uppercase tracking-wider">Credits Available</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select 
              className="w-full bg-slate-800 border-none rounded-lg pl-10 text-sm focus:ring-2 focus:ring-purple-500"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Dental">Dental</option>
              <option value="Real Estate">Real Estate</option>
              <option value="HVAC">HVAC</option>
            </select>
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Filter by City..." 
              className="w-full bg-slate-800 border-none rounded-lg pl-10 text-sm focus:ring-2 focus:ring-purple-500"
              value={location}
              onChange={(e) => { setLocation(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center justify-end">
            <span className="text-sm text-slate-500">{total} opportunities found</span>
          </div>
        </div>

        {/* Leads Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 space-y-4 animate-pulse">
                <div className="flex justify-between">
                  <div className="w-20 h-5 bg-slate-800 rounded" />
                  <div className="w-24 h-5 bg-slate-800 rounded" />
                </div>
                <div className="w-3/4 h-7 bg-slate-800 rounded mt-4" />
                <div className="w-1/2 h-4 bg-slate-800 rounded" />
                <div className="space-y-2 pt-4">
                  <div className="w-full h-3 bg-slate-800 rounded" />
                  <div className="w-full h-3 bg-slate-800 rounded" />
                  <div className="w-2/3 h-3 bg-slate-800 rounded" />
                </div>
                <div className="flex justify-between items-center pt-6">
                  <div className="w-24 h-3 bg-slate-800 rounded" />
                  <div className="w-32 h-10 bg-slate-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
            <Target className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-400">No leads found matching your criteria</h3>
            <p className="text-slate-500 mt-2">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads.map(lead => (
              <div 
                key={lead.id} 
                className={`group relative bg-slate-900 border transition-all duration-300 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-purple-500/10 ${
                  lead.is_unlocked ? 'border-purple-500/50' : 'border-slate-800'
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-purple-500/10 text-purple-400 text-xs font-bold px-2 py-1 rounded uppercase tracking-tighter">
                      {lead.category}
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${
                      lead.opportunity_score === 'High' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      <Target className="w-3 h-3" />
                      {lead.opportunity_score} Score
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">
                    {lead.business_name}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                    <MapPin className="w-3 h-3" />
                    {lead.location}
                  </div>

                  <p className="text-slate-500 text-sm line-clamp-2 mb-6">
                    {lead.teaser_insight}
                  </p>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="text-xs text-slate-600">
                      Updated {new Date(lead.updated_at).toLocaleDateString()}
                    </div>
                    {lead.is_unlocked ? (
                      <Link 
                        href={`/dashboard/reports/${lead.id}`} 
                        className="flex items-center gap-2 text-purple-400 font-bold text-sm hover:text-purple-300 transition-colors"
                      >
                        View Intelligence
                        <Unlock className="w-4 h-4" />
                      </Link>
                    ) : (
                      <button 
                        onClick={() => openUnlockModal(lead)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                      >
                        Unlock Report
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Teaser Revenue Leak Overlay */}
                {!lead.is_unlocked && lead.teaser_revenue_leak && (
                  <div className="absolute top-24 right-0 bg-pink-600/90 text-white text-[10px] font-black px-2 py-1 rounded-l-md uppercase transform translate-x-1 group-hover:translate-x-0 transition-transform">
                    Est. Leak: {lead.teaser_revenue_leak}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Unlock Modal */}
        {showUnlockModal && selectedLead && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowUnlockModal(false)} />
            <div className="relative glass-card w-full max-w-md p-8 border border-amber-500/30 amber-glow-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
              
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20">
                  <Lock className="text-amber-500" size={32} />
                </div>
                
                <h2 className="text-2xl font-bold mb-2">Confirm Access</h2>
                <p className="text-slate-400 text-sm mb-6">
                  Unlock full intelligence and high-conviction audit reports for <span className="text-white font-bold">{selectedLead.business_name}</span>.
                </p>
                
                <div className="w-full bg-slate-900/50 rounded-2xl p-6 border border-slate-800 mb-8">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-800">
                    <span className="text-sm text-slate-400">Unlock Cost</span>
                    <span className="font-bold text-amber-500">1 Credit</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Current Balance</span>
                    <span className="font-bold">{user?.credits || 0} Credits</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full">
                  <button 
                    onClick={() => setShowUnlockModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleUnlockConfirm}
                    disabled={unlockingId === selectedLead.id || (user?.credits || 0) < 1}
                    className="flex-1 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {unlockingId === selectedLead.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Confirm Unlock <Zap size={16} /></>
                    )}
                  </button>
                </div>
                
                {(user?.credits || 0) < 1 && (
                  <p className="mt-4 text-xs text-red-400 font-bold">
                    Insufficient credits. Please upgrade your plan.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {total > 12 && (
          <div className="flex items-center justify-center gap-4 py-8">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-slate-800 disabled:opacity-50 hover:bg-slate-700"
            >
              <ChevronLeft />
            </button>
            <span className="text-slate-400">Page {page} of {Math.ceil(total / 12)}</span>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 12)}
              className="p-2 rounded-lg bg-slate-800 disabled:opacity-50 hover:bg-slate-700"
            >
              <ChevronRight />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

