'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { 
  Search, MapPin, Target, Zap, Lock, Unlock, RefreshCw, 
  ChevronLeft, ChevronRight, Filter, Plus, Upload, CheckCircle, 
  XCircle, Edit2, Trash2, ExternalLink, AlertCircle
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface AdminLead {
  id: string;
  business_name: string;
  website_url: string;
  category: string;
  location: string;
  opportunity_score: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  is_approved: boolean;
  teaser_insight: string;
  teaser_revenue_leak: string;
  error_message?: string;
  created_at: string;
}

export default function AdminLeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLead, setNewLead] = useState({ url: '', name: '', category: '', location: '' });
  const [processing, setProcessing] = useState(false);

  // Edit states
  const [editingLead, setEditingLead] = useState<AdminLead | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/leads', { params: { page, size: 20 } });
      setLeads(res.data.leads);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to fetch admin leads', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_admin) {
      fetchLeads();
    }
  }, [page, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/admin/leads', {
        website_url: newLead.url,
        business_name: newLead.name,
        category: newLead.category,
        location: newLead.location
      });
      setShowAddForm(false);
      setNewLead({ url: '', name: '', category: '', location: '' });
      fetchLeads();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create lead');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await api.patch(`/admin/leads/${id}`, data);
      setLeads(leads.map(l => l.id === id ? { ...l, ...data } : l));
      if (editingLead?.id === id) setEditingLead(null);
    } catch (err) {
      alert('Update failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      try {
        await api.delete(`/admin/leads/${id}`);
        setLeads(leads.filter(l => l.id !== id));
      } catch (err) {
        alert('Delete failed');
      }
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      await api.post(`/admin/leads/${id}/refresh`);
      setLeads(leads.map(l => l.id === id ? { ...l, status: 'pending' } : l));
    } catch (err) {
      alert('Refresh failed');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setProcessing(true);
      await api.post('/admin/leads/bulk', formData);
      alert('Bulk upload started!');
      fetchLeads();
    } catch (err) {
      alert('Upload failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="text-center">
          <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Unauthorized</h1>
          <p className="text-slate-400 mt-2">Only authorized administrators can access this area.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Lock className="text-amber-500" />
              Admin Lead Management
            </h1>
            <p className="text-slate-400 mt-1">Populate and curate your marketplace discovery feed.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all border border-slate-700">
              <Upload className="w-4 h-4" />
              Bulk CSV
              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </label>
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              Add Single Lead
            </button>
          </div>
        </div>

        {/* Add Lead Form (Conditional) */}
        {showAddForm && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Add New Market Lead</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Website URL</label>
                <input 
                  type="url" required 
                  placeholder="https://..." 
                  className="w-full bg-slate-800 border-none rounded-lg text-sm px-4 py-2 focus:ring-2 focus:ring-amber-500"
                  value={newLead.url} onChange={e => setNewLead({...newLead, url: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Business Name</label>
                <input 
                  type="text" required 
                  placeholder="Acme Inc." 
                  className="w-full bg-slate-800 border-none rounded-lg text-sm px-4 py-2 focus:ring-2 focus:ring-amber-500"
                  value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Category</label>
                <input 
                  type="text" required 
                  placeholder="Restaurant" 
                  className="w-full bg-slate-800 border-none rounded-lg text-sm px-4 py-2 focus:ring-2 focus:ring-amber-500"
                  value={newLead.category} onChange={e => setNewLead({...newLead, category: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Location</label>
                <input 
                  type="text" required 
                  placeholder="NY, USA" 
                  className="w-full bg-slate-800 border-none rounded-lg text-sm px-4 py-2 focus:ring-2 focus:ring-amber-500"
                  value={newLead.location} onChange={e => setNewLead({...newLead, location: e.target.value})}
                />
              </div>
              <button 
                type="submit" 
                disabled={processing}
                className="bg-white text-black font-bold text-sm h-10 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {processing ? 'Creating...' : 'Launch Generation'}
              </button>
            </form>
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 text-[10px] text-slate-500 uppercase font-black tracking-widest border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Lead Information</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Approval</th>
                  <th className="px-6 py-4">Insight Preview</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  [1,2,3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-8 bg-slate-800/10" />
                    </tr>
                  ))
                ) : leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{lead.business_name}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {lead.website_url}
                        </span>
                        <span className="text-[10px] text-slate-600 mt-1 uppercase font-bold tracking-tighter">
                          {lead.category} • {lead.location}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 w-fit ${
                          lead.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          lead.status === 'processing' ? 'bg-amber-500/10 text-amber-500' :
                          lead.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {lead.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {lead.status === 'processing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                          {lead.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                          {lead.status}
                        </div>
                        {lead.error_message && (
                          <span className="text-[10px] text-red-400 max-w-[150px] truncate" title={lead.error_message}>
                            {lead.error_message}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleUpdate(lead.id, { is_approved: !lead.is_approved })}
                        className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border transition-all ${
                          lead.is_approved 
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20' 
                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {lead.is_approved ? 'Approved' : 'Reject / Draft'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-xs text-slate-400 line-clamp-2 italic">
                          "{lead.teaser_insight || 'No insight yet...'}"
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                            Score: {lead.opportunity_score}
                          </span>
                          <span className="text-[10px] bg-pink-500/10 text-pink-500 px-1.5 py-0.5 rounded font-bold">
                            Leak: {lead.teaser_revenue_leak || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingLead(lead)}
                          className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-blue-400 transition-colors"
                          title="Edit Teaser"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleRefresh(lead.id)}
                          className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-amber-500 transition-colors"
                          title="Regenerate Report"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(lead.id)}
                          className="p-2 bg-slate-800 rounded-lg hover:bg-red-900/30 text-red-500 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-4 py-6 border-t border-slate-800">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-slate-800 disabled:opacity-50 hover:bg-slate-700"
              >
                <ChevronLeft />
              </button>
              <span className="text-slate-500 text-sm">Page {page} of {Math.ceil(total / 20)}</span>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="p-2 rounded-lg bg-slate-800 disabled:opacity-50 hover:bg-slate-700"
              >
                <ChevronRight />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal (Conditional) */}
      {editingLead && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Edit2 className="text-blue-500" />
              Refine Lead Curation
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black uppercase text-slate-500 mb-2 block tracking-widest">Teaser Headline / Name</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-800 border-none rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingLead.business_name}
                  id="edit-name"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-500 mb-2 block tracking-widest">Main Insight / Hook</label>
                <textarea 
                  className="w-full bg-slate-800 border-none rounded-xl text-sm px-4 py-3 h-32 focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingLead.teaser_insight}
                  id="edit-insight"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 mb-2 block tracking-widest">Opportunity Score</label>
                  <select id="edit-score" className="w-full bg-slate-800 border-none rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-blue-500" defaultValue={editingLead.opportunity_score}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 mb-2 block tracking-widest">Revenue Leak</label>
                  <input id="edit-leak" type="text" className="w-full bg-slate-800 border-none rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-blue-500" defaultValue={editingLead.teaser_revenue_leak} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-8">
              <button 
                onClick={() => {
                  const data = {
                    business_name: (document.getElementById('edit-name') as HTMLInputElement).value,
                    teaser_insight: (document.getElementById('edit-insight') as HTMLTextAreaElement).value,
                    opportunity_score: (document.getElementById('edit-score') as HTMLSelectElement).value,
                    teaser_revenue_leak: (document.getElementById('edit-leak') as HTMLInputElement).value
                  };
                  handleUpdate(editingLead.id, data);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Save Refinement
              </button>
              <button 
                onClick={() => setEditingLead(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
