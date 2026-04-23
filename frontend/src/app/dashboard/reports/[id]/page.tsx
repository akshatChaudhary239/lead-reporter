'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Globe, 
  Search,
  Loader2,
  ShieldAlert,
  Zap,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      const res = await api.get(`/reports/${id}`);
      return res.data;
    },
  });

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
        <p className="text-slate-400 animate-pulse">Decrypting audit data...</p>
      </div>
    </DashboardLayout>
  );

  if (error || !report) return (
    <DashboardLayout>
      <div className="text-center py-20">
        <ShieldAlert className="text-red-500 mx-auto mb-4" size={64} />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-400 mb-8">This report is classified or does not exist.</p>
        <button onClick={() => router.push('/dashboard')} className="btn-premium py-2 px-6">Back to Dashboard</button>
      </div>
    </DashboardLayout>
  );

  // Robust data mapping
  const reportData = report.report_json || {};
  const page1 = reportData.page1 || {};
  const issues = page1.issues || [];
  const competitors = page1.competitor_gap || [];
  
  // Heuristic scores if missing
  const overallScore = page1.opportunity_score === 'High' ? 85 : page1.opportunity_score === 'Medium' ? 65 : 45;
  const seoScore = 70; // Placeholder
  const convScore = 60; // Placeholder

  const handleDownload = async () => {
    try {
      const res = await api.get(`/reports/${id}/pdf`, { responseType: 'blob' });
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
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{report.business_name}</h1>
              <p className="text-slate-400 text-sm flex items-center gap-2">
                <Globe size={14} /> {report.website_url}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={() => window.open(report.website_url, '_blank')}
              className="p-2.5 bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-300 transition-colors"
              title="Visit Website"
            >
              <ExternalLink size={20} />
            </button>
            <button 
              onClick={handleDownload}
              className="btn-premium flex items-center gap-2"
            >
              <Download size={20} /> Download PDF
            </button>
          </div>
        </div>

        {/* Audit Status Banner */}
        <div className="glass-card overflow-hidden border-amber-500/20">
          <div className="bg-gradient-to-r from-amber-500/10 via-transparent to-transparent p-8 flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center amber-glow shrink-0">
              <Zap className="text-slate-900" size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Audit Sequence Complete</h3>
              <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                {page1.loss_reasoning || `We have identified critical conversion leaks and competitive gaps for ${report.business_name}. This audit provides a direct roadmap to recovery.`}
              </p>
            </div>
          </div>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <ScoreCard label="Opportunity" score={overallScore} color="text-amber-500" icon={TrendingUp} />
          <ScoreCard label="Market Gap" score={80} color="text-blue-500" icon={Globe} />
          <ScoreCard label="Conversion" score={convScore} color="text-green-500" icon={Zap} />
          <ScoreCard label="Risk Level" score={90} color="text-red-500" icon={ShieldAlert} />
        </div>

        {/* Main Content Sections */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column: Analysis */}
          <div className="md:col-span-2 space-y-8">
            <section className="glass-card p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Search className="text-amber-500" size={24} />
                  <h2 className="text-xl font-bold">Critical Revenue Leaks</h2>
                </div>
                <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-red-500/20">
                  Action Required
                </span>
              </div>
              
              <div className="space-y-6">
                {issues.map((issue: any, idx: number) => (
                  <div key={idx} className="group bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 hover:border-amber-500/30 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-bold text-lg group-hover:text-amber-500 transition-colors">{issue.title}</h4>
                      <span className="text-[10px] font-bold bg-slate-700 px-2 py-1 rounded uppercase">{issue.impact || 'High Impact'}</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">{issue.fix}</p>
                    <div className="pt-4 border-t border-slate-700 flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                      <TrendingUp size={14} /> {issue.revenue_implication || 'Immediate Revenue Growth'}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Competitor Gap */}
            <section className="glass-card p-8">
              <div className="flex items-center gap-3 mb-8">
                <BarChart3 className="text-blue-500" size={24} />
                <h2 className="text-xl font-bold">Competitive Disadvantage</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {competitors.map((comp: any, idx: number) => (
                  <div key={idx} className="p-5 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{comp.competitor}</span>
                      <Users size={16} className="text-slate-500" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Their Advantage:</p>
                      <p className="text-xs text-blue-400 font-medium">{comp.they_have}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-500">The Impact:</p>
                      <p className="text-xs text-red-400 font-medium">{comp.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Execution */}
          <div className="space-y-8">
            <section className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-amber-500 mb-6 flex items-center gap-2">
                <Zap size={16} /> Fast Recovery Plan
              </h3>
              <div className="space-y-4">
                 <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <p className="text-xs text-slate-300 leading-relaxed">Fix identified Above-the-fold CTA placement to stop initial bounce traffic.</p>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <p className="text-xs text-slate-300 leading-relaxed">Deploy trust signals and social proof matching local competitors.</p>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <p className="text-xs text-slate-300 leading-relaxed">Automate lead capture following the recommended outreach scripts.</p>
                 </div>
              </div>
            </section>

            <section className="bg-amber-500 p-8 rounded-3xl text-slate-900 shadow-2xl shadow-amber-500/20">
              <BarChart3 className="mb-4" size={32} />
              <h3 className="text-2xl font-black mb-2 leading-none">THE KILL SHOT</h3>
              <p className="text-sm font-bold mb-8 leading-relaxed opacity-80">
                You now have the exact data needed to close this client. Every weakness identified is a revenue growth opportunity for you to fix.
              </p>
              <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:translate-y-[-2px] transition-all active:translate-y-[0px]">
                Generate Final Proposal
              </button>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ScoreCard({ label, score, color, icon: Icon }: any) {
  return (
    <div className="glass-card p-6 flex flex-col items-center text-center group hover:border-amber-500/30 transition-all">
      <div className={`${color.replace('text', 'bg')}/10 p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className={color} size={24} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{label}</span>
      <div className="text-3xl font-black tracking-tight">{score}%</div>
      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          className={`h-full ${color.replace('text', 'bg')} amber-glow`} 
        />
      </div>
    </div>
  );
}
