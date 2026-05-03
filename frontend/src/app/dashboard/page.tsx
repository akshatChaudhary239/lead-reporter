'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, Clock, CheckCircle2, XCircle, Download, ExternalLink, Loader2, Target } from 'lucide-react';
import Link from 'next/link';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Suspense } from 'react';

interface Report {
  id: string;
  business_name: string;
  website_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
        try {
          const res = await api.get(`/billing/verify-session/${sessionId}`);
          if (res.data.status === 'success') {
            await refreshUser(); // Update global auth state
            // Clear the session_id from URL
            router.replace('/dashboard');
          }
        } catch (err) {
          console.error('Payment verification failed', err);
        }
      }
    };
    verifyPayment();
  }, [searchParams, refreshUser, router]);
  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await api.get('/reports/');
      return res.data as Report[];
    },
    refetchInterval: 10000, // Poll every 10s
  });

  const stats = [
    { name: 'Leads Accessed', value: reports?.length || 0, icon: FileText, color: 'text-blue-500' },
    { name: 'High-Conviction', value: reports?.filter(r => r.status === 'completed').length || 0, icon: CheckCircle2, color: 'text-green-500' },
    { name: 'Intelligence Assets', value: reports?.length || 0, icon: Target, color: 'text-amber-500' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <div key={stat.name} className="glass-card p-6 flex items-center gap-6">
              <div className={`w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center ${stat.color}`}>
                <stat.icon size={28} />
              </div>
              <div>
                <p className="text-sm text-slate-400 font-medium">{stat.name}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reports Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-bold">Recent Intelligence Assets</h3>
            <Link href="/dashboard/reports" className="text-sm text-amber-500 font-medium hover:underline">View All</Link>
          </div>
          
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p>Loading your arsenal...</p>
            </div>
          ) : reports?.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-500">
              <FileText className="mb-4 opacity-20" size={48} />
              <p className="mb-6">Unlock high-conviction leads from the Opportunities page to see them here.</p>
              <Link href="/dashboard/discover" className="btn-premium py-2 text-sm">Discover Opportunities</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/30 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold">Business</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Accessed</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {reports?.map((report) => (
                    <tr key={report.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-sm">{report.business_name}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{report.website_url}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {report.status === 'completed' && <CheckCircle2 className="text-green-500" size={16} />}
                          {report.status === 'processing' && <Loader2 className="text-amber-500 animate-spin" size={16} />}
                          {report.status === 'failed' && <XCircle className="text-red-500" size={16} />}
                          {report.status === 'pending' && <Clock className="text-slate-500" size={16} />}
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
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {report.status === 'completed' && (
                            <>
                              <button 
                                onClick={async () => {
                                  try {
                                    const res = await api.get(`/reports/${report.id}/pdf`, { responseType: 'blob' });
                                    const url = window.URL.createObjectURL(new Blob([res.data]));
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', `${report.business_name}_Audit.pdf`);
                                    document.body.appendChild(link);
                                    link.click();
                                    link.remove();
                                  } catch (err) {
                                    console.error('Download failed', err);
                                  }
                                }}
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={48} />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
