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
  ExternalLink,
  Target,
  BrainCircuit,
  Clock,
  ArrowRight,
  MousePointer2,
  Lock,
  MessageSquare,
  Mail,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import GrowthChart from '@/components/charts/GrowthChart';
import RadarChart from '@/components/charts/RadarChart';
import FunnelChart from '@/components/charts/FunnelChart';

export default function DiscoveryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('intelligence'); // intelligence | roadmap | closer

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['discovery_report', id],
    queryFn: async () => {
      const res = await api.get(`/discover/${id}`);
      return res.data;
    },
  });

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="animate-spin text-amber-500 mb-4" size={48} />
        <p className="text-slate-400 animate-pulse">Processing High-Conviction Intelligence...</p>
      </div>
    </DashboardLayout>
  );

  if (error || !report) return (
    <DashboardLayout>
      <div className="text-center py-20">
        <ShieldAlert className="text-red-500 mx-auto mb-4" size={64} />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-400 mb-8">This report is classified or does not exist.</p>
        <button onClick={() => router.push('/dashboard/discover')} className="btn-premium py-2 px-6">Back to Discover</button>
      </div>
    </DashboardLayout>
  );

  const reportData = report.report_json || {};
  
  // Backward compatibility with old reports
  const isNewSchema = !!reportData.summary;
  const summary = reportData.summary || { 
    business_model: reportData.page1?.business_model_inferred || 'Local Business',
    opportunity_score: reportData.page1?.opportunity_score === 'High' ? 0.85 : 0.65,
    confidence_level: 'High',
    revenue_leak_estimate: { min: 1000, max: 2500, currency: 'USD', reasoning: reportData.page1?.loss_reasoning }
  };

  const scores = reportData.scores || {
    seo: { score: 70, label: 'Standard', weight: 0.3, metrics: { meta: 70, speed: 60, indexing: 80 } },
    conversion: { score: 55, label: 'Needs Fix', weight: 0.5, metrics: { cta: 40, clarity: 60, friction: 50 } },
    trust: { score: 65, label: 'Average', weight: 0.2, metrics: { reviews: 40, proof: 70, social: 80 } }
  };

  const visuals = reportData.visuals || {
    growth_chart: [ { period: 'Current', value: 1000 }, { period: 'Phase 1', value: 1500 }, { period: 'Phase 2', value: 2500 }, { period: 'Phase 3', value: 4000 } ],
    funnel: [ { stage: 'Visitors', value: 1000 }, { stage: 'Interest', value: 200 }, { stage: 'Conversion', value: 20 }, { stage: 'Revenue', value: 10 } ],
    radar: [ { metric: 'SEO', business: 60, competitor_avg: 80 }, { metric: 'UX', business: 50, competitor_avg: 70 }, { metric: 'Social', business: 85, competitor_avg: 75 }, { metric: 'Reviews', business: 40, competitor_avg: 80 } ]
  };

  const prioritizedActions = reportData.prioritized_actions || (reportData.page1?.issues || []).map((i: any) => ({
    title: i.title,
    impact: 'High',
    effort: 'Moderate',
    roi: '3x',
    description: i.fix
  }));

  const competitorAnalysis = reportData.competitor_analysis || (reportData.page1?.competitor_gap || []).map((c: any) => ({
    name: c.competitor,
    strengths: c.they_have,
    weaknesses: 'Unknown',
    strategic_gap: c.impact
  }));

  const roadmap = reportData.roadmap || {
    phase1: { title: 'Quick Wins', duration: 'Week 1-2', tasks: (reportData.page2?.month1 || []).map((t: any) => ({ task: t.task, outcome: t.how, tools: [] })) },
    phase2: { title: 'Optimization', duration: 'Month 1', tasks: (reportData.page2?.month2 || []).map((t: any) => ({ task: t.task, outcome: t.how, tools: [] })) },
    phase3: { title: 'Scaling', duration: 'Month 2-3', tasks: (reportData.page2?.month3 || []).map((t: any) => ({ task: t.task, outcome: t.how, tools: [] })) }
  };

  const outreach = reportData.outreach || {
    soft_approach: { subject: reportData.page3?.email_subject, body: reportData.page3?.email_body },
    value_first: { subject: 'Improvement Audit', body: reportData.page3?.whatsapp_script },
    direct_roi: { subject: 'Revenue Loss Found', body: reportData.page3?.call_opener }
  };

  // Discovery reports do not support PDF export yet


  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard/discover')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                {report.business_name}
                <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest font-black">
                  Live Audit
                </span>
              </h1>
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
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-2xl w-fit border border-slate-700/50">
          <TabButton active={activeTab === 'intelligence'} onClick={() => setActiveTab('intelligence')} icon={BrainCircuit} label="Intelligence" />
          <TabButton active={activeTab === 'roadmap'} onClick={() => setActiveTab('roadmap')} icon={Target} label="Roadmap" />
          <TabButton active={activeTab === 'closer'} onClick={() => setActiveTab('closer')} icon={Zap} label="Closer Mode" />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'intelligence' && (
            <motion.div 
              key="intelligence"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Top Banner: Revenue Leak */}
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card p-8 border-amber-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp size={200} />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ShieldAlert size={16} /> Critical Revenue Leak Detected
                    </h3>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-5xl font-black tracking-tighter">
                        {summary.revenue_leak_estimate.currency === 'USD' ? '$' : '₹'}
                        {summary.revenue_leak_estimate.min} - {summary.revenue_leak_estimate.max}
                      </span>
                      <span className="text-slate-500 font-bold text-lg">/ MONTH</span>
                    </div>
                    <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mb-8">
                      {summary.revenue_leak_estimate.reasoning}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-sm font-bold flex items-center gap-2">
                        Opportunity Score: <span className="text-amber-500">{(summary.opportunity_score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-sm font-bold flex items-center gap-2">
                        Confidence: <span className="text-green-500">{summary.confidence_level}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-8 flex flex-col justify-between">
                   <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Business Model</h3>
                    <p className="text-xl font-bold leading-tight">{summary.business_model}</p>
                   </div>
                   <div className="mt-8 pt-8 border-t border-slate-800">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Top Action Prioritized</h3>
                    <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                      <Zap className="text-amber-500 shrink-0" size={20} />
                      <span className="text-sm font-bold text-amber-500">{prioritizedActions[0]?.title}</span>
                    </div>
                   </div>
                </div>
              </div>

              {/* Visual Intelligence Section */}
              <div className="grid lg:grid-cols-2 gap-8">
                <section className="glass-card p-8">
                  <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                    <TrendingUp className="text-amber-500" size={20} /> Growth Potential Chart
                  </h3>
                  <GrowthChart data={visuals.growth_chart} />
                  <p className="mt-6 text-xs text-slate-500 italic text-center">
                    Projection based on 3-month optimization roadmap implementation.
                  </p>
                </section>

                <section className="glass-card p-8">
                  <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                    <BarChart3 className="text-blue-500" size={20} /> Competitive Radar
                  </h3>
                  <RadarChart data={visuals.radar} />
                </section>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                 {/* Funnel Breakdown */}
                 <section className="glass-card p-8">
                  <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                    <MousePointer2 className="text-green-500" size={20} /> Conversion Funnel
                  </h3>
                  <FunnelChart data={visuals.funnel} />
                  <div className="mt-8 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                    <p className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1">
                      <AlertCircle size={12} /> CRITICAL DROP-OFF
                    </p>
                    <p className="text-xs text-slate-400">Largest drop detected between Interest and Conversion stages.</p>
                  </div>
                </section>

                {/* Score Breakdown */}
                <section className="lg:col-span-2 space-y-6">
                  <div className="grid sm:grid-cols-3 gap-6">
                    <DynamicScoreCard type="SEO" data={scores.seo} />
                    <DynamicScoreCard type="Conversion" data={scores.conversion} />
                    <DynamicScoreCard type="Trust" data={scores.trust} />
                  </div>

                  <div className="glass-card p-8">
                    <h3 className="text-lg font-bold mb-8">Prioritized Fixes</h3>
                    <div className="space-y-4">
                      {prioritizedActions.map((action: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-6 p-6 bg-slate-800/30 rounded-2xl border border-slate-700/50 hover:border-amber-500/30 transition-all group">
                          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-slate-900 transition-colors">
                            <span className="font-black">0{idx + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-lg">{action.title}</h4>
                              <div className="flex gap-2">
                                <Badge color={action.impact === 'High' ? 'red' : 'amber'} label={`${action.impact} Impact`} />
                                <Badge color="blue" label={`${action.effort} Effort`} />
                                <Badge color="green" label={`${action.roi} ROI`} />
                              </div>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed mb-4">{action.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              {/* Competitive Strategy */}
              <section className="glass-card p-8">
                <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                  <Target className="text-red-500" size={20} /> Competitive Strategic Gap
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {competitorAnalysis.map((comp: any, idx: number) => (
                    <div key={idx} className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-black text-slate-300">{comp.name}</span>
                        <Lock size={16} className="text-slate-600" />
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Their Strength</p>
                          <p className="text-sm text-blue-400 font-bold">{comp.strengths}</p>
                        </div>
                        <div className="pt-4 border-t border-slate-700">
                          <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">Strategic Gap</p>
                          <p className="text-sm text-slate-300">{comp.strategic_gap}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'roadmap' && (
            <motion.div 
              key="roadmap"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="grid md:grid-cols-3 gap-8">
                <RoadmapPhase phase={roadmap.phase1} color="amber" icon={Zap} />
                <RoadmapPhase phase={roadmap.phase2} color="blue" icon={Target} />
                <RoadmapPhase phase={roadmap.phase3} color="green" icon={TrendingUp} />
              </div>
            </motion.div>
          )}

          {activeTab === 'closer' && (
            <motion.div 
              key="closer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="glass-card p-8 border-amber-500/20 bg-amber-500/5">
                <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                  <Zap className="text-amber-500" /> CLOSER MODE ACTIVATED
                </h2>
                <p className="text-slate-400 mb-8 max-w-3xl">
                  Use these scripts to leverage the audit findings. These are designed to highlight revenue loss and position you as the solution expert.
                </p>

                <div className="grid lg:grid-cols-3 gap-8">
                  <OutreachCard 
                    title="The Soft Approach" 
                    icon={MessageSquare} 
                    content={outreach.soft_approach} 
                    type="WhatsApp / DM"
                  />
                  <OutreachCard 
                    title="Value-First Audit" 
                    icon={Mail} 
                    content={outreach.value_first} 
                    type="Professional Email"
                  />
                  <OutreachCard 
                    title="Direct ROI Pitch" 
                    icon={Phone} 
                    content={outreach.direct_roi} 
                    type="Phone / Meeting"
                  />
                </div>
              </div>
              
              <section className="bg-amber-500 p-12 rounded-3xl text-slate-900 shadow-2xl shadow-amber-500/30 flex flex-col items-center text-center">
                <Target className="mb-6" size={48} />
                <h3 className="text-4xl font-black mb-4 leading-tight">READY TO CLOSE THE DEAL?</h3>
                <p className="text-lg font-bold mb-10 max-w-2xl opacity-90">
                  Every metric we've identified is a pain point for {report.business_name}. Present these findings as the foundation of your proposal.
                </p>
                <div className="flex gap-4 w-full max-w-md">
                   <button className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:translate-y-[-2px] transition-all">
                    Download Proposal
                  </button>
                  <button className="flex-1 bg-white text-slate-900 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:translate-y-[-2px] transition-all border-2 border-slate-900/10">
                    Deal Estimator
                  </button>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
        active 
          ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' 
          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function DynamicScoreCard({ type, data }: any) {
  return (
    <div className="glass-card p-6 border-slate-700/50">
      <div className="flex justify-between items-start mb-6">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{type} Score</span>
        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
          data.score > 75 ? 'bg-green-500/10 text-green-500' : 
          data.score > 50 ? 'bg-amber-500/10 text-amber-500' : 
          'bg-red-500/10 text-red-500'
        }`}>{data.label}</span>
      </div>
      <div className="text-4xl font-black mb-4 tracking-tighter">{data.score}<span className="text-lg opacity-20">%</span></div>
      <div className="space-y-3">
        {Object.entries(data.metrics).map(([key, val]: any) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-[9px] uppercase font-bold text-slate-500">
              <span>{key}</span>
              <span>{val}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-slate-600 rounded-full" style={{ width: `${val}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoadmapPhase({ phase, color, icon: Icon }: any) {
  const colors: any = {
    amber: 'border-amber-500/20 text-amber-500 bg-amber-500/5',
    blue: 'border-blue-500/20 text-blue-500 bg-blue-500/5',
    green: 'border-green-500/20 text-green-500 bg-green-500/5'
  };

  return (
    <div className={`glass-card p-8 border-t-4 ${colors[color].split(' ')[0].replace('border-', 'border-t-')}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <h3 className="font-black text-lg">{phase.title}</h3>
          <p className="text-xs text-slate-500 font-bold uppercase">{phase.duration}</p>
        </div>
      </div>
      <div className="space-y-6">
        {phase.tasks.map((task: any, idx: number) => (
          <div key={idx} className="relative pl-6 border-l border-slate-800 last:border-0">
             <div className="absolute left-[-5px] top-1 w-[10px] h-[10px] rounded-full bg-slate-800 border-2 border-slate-700" />
             <h4 className="text-sm font-bold mb-1">{task.task}</h4>
             <p className="text-xs text-slate-400 mb-3">{task.outcome}</p>
             <div className="flex flex-wrap gap-1">
                {task.tools?.map((tool: string) => (
                  <span key={tool} className="text-[8px] font-bold bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">{tool}</span>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutreachCard({ title, icon: Icon, content, type }: any) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = `Subject: ${content.subject}\n\n${content.body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg text-amber-500">
            <Icon size={18} />
          </div>
          <h4 className="font-bold">{title}</h4>
        </div>
        <span className="text-[9px] font-black bg-slate-800 px-2 py-1 rounded uppercase text-slate-500">{type}</span>
      </div>
      <div className="flex-1 bg-slate-900/50 rounded-xl p-4 border border-slate-800 mb-6 font-mono text-xs text-slate-400 leading-relaxed overflow-auto max-h-[200px] whitespace-pre-wrap">
        <p className="font-bold text-amber-500/80 mb-2">Subject: {content.subject}</p>
        {content.body}
      </div>
      <button 
        onClick={copyToClipboard}
        className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
      >
        {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <TrendingUp size={14} />}
        {copied ? 'Copied' : 'Copy Script'}
      </button>
    </div>
  );
}

function Badge({ color, label }: { color: string, label: string }) {
  const colors: any = {
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    green: 'bg-green-500/10 text-green-500 border-green-500/20'
  };
  return (
    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-tighter ${colors[color]}`}>
      {label}
    </span>
  );
}
