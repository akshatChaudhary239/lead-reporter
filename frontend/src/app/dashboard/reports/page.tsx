'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, CheckCircle2, XCircle, Download, ExternalLink, Loader2, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface Report {
  id: string;
  business_name: string;
  website_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await api.get('/reports/');
      return res.data as Report[];
    },
  });

  const filteredReports = reports?.filter(r => 
    r.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.website_url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = async (id: string, name: string) => {
    try {
      const res = await api.get(`/reports/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${name}_Audit.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/20 p-6 rounded-2xl border border-slate-800">
          <div>
            <h1 className="text-2xl font-bold mb-1">Your Intelligence Vault</h1>
            <p className="text-sm text-slate-400">Review and manage your unlocked business intelligence.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search targets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors w-64"
              />
            </div>
            <button className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Reports Grid/Table */}
        <div className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p>Scanning intelligence archives...</p>
            </div>
          ) : filteredReports?.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-500 text-center">
              <Search className="mb-4 opacity-20" size={48} />
              <p className="mb-2 font-bold">No intelligence found</p>
              <p className="text-sm">Explore the Opportunities page to unlock your first high-conviction lead.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/30 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold">Business Asset</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Accessed On</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredReports?.map((report) => (
                    <tr key={report.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            report.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                            report.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-500'
                          }`}>
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{report.business_name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[250px]">{report.website_url}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            report.status === 'completed' ? 'bg-green-500' :
                            report.status === 'processing' ? 'bg-amber-500 animate-pulse' :
                            report.status === 'failed' ? 'bg-red-500' : 'bg-slate-500'
                          }`} />
                          <span className={`text-xs font-bold uppercase tracking-wide ${
                            report.status === 'completed' ? 'text-green-500' :
                            report.status === 'processing' ? 'text-amber-500' :
                            report.status === 'failed' ? 'text-red-500' : 'text-slate-500'
                          }`}>
                            {report.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(report.created_at).toLocaleDateString(undefined, { 
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {report.status === 'completed' && (
                            <>
                              <button 
                                onClick={() => handleDownload(report.id, report.business_name)}
                                className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-amber-500 transition-colors"
                                title="Download PDF"
                              >
                                <Download size={18} />
                              </button>
                              <Link 
                                href={`/dashboard/reports/${report.id}`}
                                className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-blue-400 transition-colors"
                                title="View Details"
                              >
                                <ExternalLink size={18} />
                              </Link>
                            </>
                          )}
                          {report.status === 'failed' && (
                            <button className="text-xs font-bold text-red-500 hover:underline">Retry Audit</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
