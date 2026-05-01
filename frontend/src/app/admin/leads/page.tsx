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
  report_json?: any;
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
  const [editTab, setEditTab] = useState<'basic' | 'json'>('basic');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

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

  // Add polling for active generations
  useEffect(() => {
    const activeGenerations = leads.some(l => l.status === 'pending' || l.status === 'processing');
    
    if (activeGenerations) {
      const interval = setInterval(() => {
        fetchLeads();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [leads]);

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
      return true;
    } catch (err) {
      alert('Update failed');
      return false;
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
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      
      const response = await fetch(`${apiUrl}/admin/leads/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      alert('Bulk upload started!');
      fetchLeads();
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
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
                          onClick={() => {
                            setEditingLead(lead);
                            setJsonInput(JSON.stringify(lead.report_json || {}, null, 2));
                            setEditTab('basic');
                          }}
                          className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-blue-400 transition-colors"
                          title="Curate Audit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <a 
                          href={`/dashboard/reports/${lead.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-emerald-400 transition-colors"
                          title="View Live Report"
                        >
                          <ExternalLink size={16} />
                        </a>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Curate Audit Intelligence</h3>
                  <p className="text-xs text-slate-500">{editingLead.business_name} • {editingLead.website_url}</p>
                </div>
              </div>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button 
                  onClick={() => setEditTab('basic')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${editTab === 'basic' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Basic Info
                </button>
                <button 
                  onClick={() => setEditTab('json')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${editTab === 'json' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Full Report JSON
                </button>
              </div>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              {editTab === 'basic' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Business Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-800 border-slate-700 rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-blue-500"
                        defaultValue={editingLead.business_name}
                        id="edit-name"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Category</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-800 border-slate-700 rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-blue-500"
                        defaultValue={editingLead.category}
                        id="edit-category"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Teaser Insight / Hook</label>
                    <textarea 
                      className="w-full bg-slate-800 border-slate-700 rounded-xl text-sm px-4 py-3 h-24 focus:ring-2 focus:ring-blue-500"
                      defaultValue={editingLead.teaser_insight}
                      id="edit-insight"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Opportunity Score</label>
                      <select id="edit-score" className="w-full bg-slate-800 border-slate-700 rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-blue-500" defaultValue={editingLead.opportunity_score}>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Revenue Leak Preview</label>
                      <input id="edit-leak" type="text" className="w-full bg-slate-800 border-slate-700 rounded-xl text-sm px-4 py-3 focus:ring-2 focus:ring-blue-500" defaultValue={editingLead.teaser_revenue_leak} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block">Raw Report Data (JSON)</label>
                    {jsonError && <span className="text-[10px] font-bold text-red-500">Invalid JSON: {jsonError}</span>}
                  </div>
                  <textarea 
                    className={`w-full bg-slate-950 border ${jsonError ? 'border-red-500' : 'border-slate-800'} rounded-xl text-[12px] font-mono p-6 h-[400px] focus:ring-2 focus:ring-blue-500 outline-none`}
                    value={jsonInput}
                    onChange={(e) => {
                      setJsonInput(e.target.value);
                      try {
                        JSON.parse(e.target.value);
                        setJsonError(null);
                      } catch (err: any) {
                        setJsonError(err.message);
                      }
                    }}
                    spellCheck={false}
                  />
                  <p className="text-[10px] text-slate-500 italic">
                    Note: Editing this JSON directly changes the charts, roadmap, and scripts displayed to the user.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex items-center gap-4">
              <button 
                disabled={processing || (editTab === 'json' && !!jsonError)}
                onClick={async () => {
                  setProcessing(true);
                  let data: any = {};
                  
                  if (editTab === 'basic') {
                    data = {
                      business_name: (document.getElementById('edit-name') as HTMLInputElement).value,
                      category: (document.getElementById('edit-category') as HTMLInputElement).value,
                      teaser_insight: (document.getElementById('edit-insight') as HTMLTextAreaElement).value,
                      opportunity_score: (document.getElementById('edit-score') as HTMLSelectElement).value,
                      teaser_revenue_leak: (document.getElementById('edit-leak') as HTMLInputElement).value
                    };
                  } else {
                    try {
                      data = { report_json: JSON.parse(jsonInput) };
                    } catch (e) {
                      setProcessing(false);
                      return;
                    }
                  }
                  
                  const success = await handleUpdate(editingLead.id, data);
                  setProcessing(false);
                  if (success) setEditingLead(null);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle size={18} />}
                {processing ? 'Saving Changes...' : 'Save Refinement'}
              </button>
              <button 
                onClick={() => setEditingLead(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl transition-all"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
