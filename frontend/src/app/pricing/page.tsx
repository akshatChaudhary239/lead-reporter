'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Check, Zap, Target, Crown, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type Currency = 'INR' | 'USD';

const plans = {
  INR: [
    {
      id: 'starter',
      name: 'Starter Bundle',
      price: '₹99',
      description: 'Ideal for local outreach and testing 5 high-value targets.',
      features: ['5 Professional Audit Reports', 'Competitor Gap Intel', 'Downloadable PDFs', 'Outreach Scripts'],
      cta: 'Buy 5 Reports',
      icon: Target,
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '₹499',
      period: '/month',
      description: 'Perfect for scaling agencies and active hunters.',
      features: ['100 Reports Per Month', 'Priority AI Generation', 'Premium Web-view', 'Market Rivals Intel'],
      cta: 'Go Growth',
      icon: Zap,
      highlight: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '₹999',
      period: '/month',
      description: 'Total market domination for elite closers.',
      features: ['500 Reports Per Month', 'White-label Readiness', '24/7 Priority Support', 'Early Intel Access'],
      cta: 'Go Pro',
      icon: Crown,
    },
  ],
  USD: [
    {
      id: 'starter',
      name: 'Starter Bundle',
      price: '$5',
      description: 'Ideal for local outreach and testing 5 high-value targets.',
      features: ['5 Professional Audit Reports', 'Competitor Gap Intel', 'Downloadable PDFs', 'Outreach Scripts'],
      cta: 'Buy 5 Reports',
      icon: Target,
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '$15',
      period: '/month',
      description: 'Perfect for scaling agencies and active hunters.',
      features: ['100 Reports Per Month', 'Priority AI Generation', 'Premium Web-view', 'Market Rivals Intel'],
      cta: 'Go Growth',
      icon: Zap,
      highlight: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$25',
      period: '/month',
      description: 'Total market domination for elite closers.',
      features: ['500 Reports Per Month', 'White-label Readiness', '24/7 Priority Support', 'Early Intel Access'],
      cta: 'Go Pro',
      icon: Crown,
    },
  ],
};

export default function PricingPage() {
  const [currency, setCurrency] = useState<Currency>('INR');
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await api.post('/billing/checkout', { 
        plan_id: planId,
        currency: currency.toLowerCase()
      });
      window.location.href = res.data.url;
    } catch (err) {
      console.error('Checkout failed', err);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Navigation */}
      <nav className="h-20 flex items-center justify-between px-8 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center amber-glow">
            <Target className="text-slate-900" size={18} />
          </div>
          <span className="font-bold text-xl tracking-tighter text-white">Get<span className="text-amber-500">Prospectra</span></span>
        </Link>
        <Link href="/dashboard" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
          Back to Dashboard
        </Link>
      </nav>

      <div className="max-w-7xl mx-auto px-8 pt-12 pb-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black mb-6">Choose Your <span className="text-amber-500">Arsenal</span></h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
            Select the plan that matches your ambition. Tactical pricing for global domination.
          </p>

          {/* Currency Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-bold ${currency === 'INR' ? 'text-white' : 'text-slate-500'}`}>🇮🇳 INR</span>
            <button 
              onClick={() => setCurrency(prev => prev === 'INR' ? 'USD' : 'INR')}
              className="w-14 h-7 bg-slate-800 rounded-full relative p-1 transition-colors hover:bg-slate-700"
            >
              <motion.div 
                animate={{ x: currency === 'INR' ? 0 : 28 }}
                className="w-5 h-5 bg-amber-500 rounded-full"
              />
            </button>
            <span className={`text-sm font-bold ${currency === 'USD' ? 'text-white' : 'text-slate-500'}`}>🌍 USD</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <AnimatePresence mode="wait">
            {plans[currency].map((plan) => (
              <motion.div
                key={`${currency}-${plan.id}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`glass-card p-8 flex flex-col relative ${
                  plan.highlight ? 'border-amber-500 shadow-2xl shadow-amber-500/10' : 'border-slate-800'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="mb-8">
                  <plan.icon className={`mb-6 ${plan.highlight ? 'text-amber-500' : 'text-slate-500'}`} size={40} />
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className="text-slate-500 font-bold">{plan.period}</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{plan.description}</p>
                </div>

                <div className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="text-amber-500 shrink-0 mt-1" size={16} />
                      <span className="text-sm text-slate-300 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading !== null}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    plan.highlight 
                      ? 'bg-amber-500 text-slate-900 hover:scale-[1.02]' 
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {loading === plan.id ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      {plan.cta} <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
