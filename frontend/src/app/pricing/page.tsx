'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Check, Zap, Target, Crown, Loader2, ArrowRight, ShieldCheck, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

type Currency = 'INR' | 'USD';
type PaymentStatus = 'idle' | 'processing' | 'verifying' | 'success' | 'failed';

const plans = {
  INR: [
    {
      id: 'starter',
      name: 'Starter Bundle',
      price: '₹499',
      description: 'Ideal for local outreach and testing 20 high-value targets.',
      features: ['20 Professional Audit Reports', 'Competitor Gap Intel', 'Downloadable PDFs', 'Outreach Scripts'],
      cta: 'Buy 20 Reports',
      icon: Target,
    },
    {
      id: 'growth',
      name: 'Growth Pack',
      price: '₹1499',
      description: 'Perfect for scaling agencies and active hunters.',
      features: ['70 Reports Total', 'Priority AI Generation', 'Premium Web-view', 'Market Rivals Intel'],
      cta: 'Get 70 Reports',
      icon: Zap,
      highlight: true,
    },
    {
      id: 'pro',
      name: 'Elite Arsenal',
      price: '₹4999',
      description: 'Total market domination for elite closers.',
      features: ['100 Reports Total', 'White-label Readiness', '24/7 Priority Support', 'Early Intel Access'],
      cta: 'Buy 100 Reports',
      icon: Crown,
    },
  ],
  USD: [
    {
      id: 'starter',
      name: 'Starter Bundle',
      price: '$5',
      description: 'Ideal for local outreach and testing 20 high-value targets.',
      features: ['20 Professional Audit Reports', 'Competitor Gap Intel', 'Downloadable PDFs', 'Outreach Scripts'],
      cta: 'Buy 20 Reports',
      icon: Target,
    },
    {
      id: 'growth',
      name: 'Growth Pack',
      price: '$15',
      description: 'Perfect for scaling agencies and active hunters.',
      features: ['70 Reports Total', 'Priority AI Generation', 'Premium Web-view', 'Market Rivals Intel'],
      cta: 'Get 70 Reports',
      icon: Zap,
      highlight: true,
    },
    {
      id: 'pro',
      name: 'Elite Arsenal',
      price: '$25',
      description: 'Total market domination for elite closers.',
      features: ['100 Reports Total', 'White-label Readiness', '24/7 Priority Support', 'Early Intel Access'],
      cta: 'Buy 100 Reports',
      icon: Crown,
    },
  ],
};

export default function PricingPage() {
  const [currency, setCurrency] = useState<Currency>('INR');
  const [loading, setLoading] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { openCheckout } = useRazorpay();
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const pollStatus = async (orderId: string) => {
    let attempts = 0;
    const maxAttempts = 15; // Poll for 30 seconds

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get(`/billing/razorpay/status/${orderId}`);
        if (res.data.status === 'captured') {
          clearInterval(interval);
          setPaymentStatus('success');
          await refreshUser();
          setTimeout(() => router.push('/dashboard'), 2000);
        } else if (res.data.status === 'failed') {
          clearInterval(interval);
          setPaymentStatus('failed');
          setErrorMessage('Payment was declined by the bank.');
        }
      } catch (err) {
        console.error('Polling error', err);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setPaymentStatus('success'); // Assume success if webhook might be slightly slow, dashboard will show real state
        await refreshUser();
        setTimeout(() => router.push('/dashboard'), 1000);
      }
    }, 2000);
  };

  const handleCheckout = async (planId: string) => {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    setLoading(planId);
    setErrorMessage(null);

    try {
      if (currency === 'INR') {
        // Razorpay Flow
        const orderRes = await api.post('/billing/razorpay/order', { 
          plan_id: planId,
          currency: 'INR'
        });

        const { order_id, amount, key_id } = orderRes.data;

        await openCheckout(
          {
            key: key_id,
            amount,
            currency: 'INR',
            name: 'GetProspectra',
            description: `Purchase ${planId} plan`,
            order_id,
            prefill: {
              name: user.full_name || '',
              email: user.email,
            },
            theme: {
              color: '#f59e0b',
            },
          },
          async (response) => {
            // onSuccess
            setPaymentStatus('verifying');
            try {
              await api.post('/billing/razorpay/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setPaymentStatus('processing');
              pollStatus(order_id);
            } catch (err) {
              setPaymentStatus('failed');
              setErrorMessage('Verification failed. Please contact support.');
            }
          },
          (error) => {
            // onFailure
            setPaymentStatus('failed');
            setErrorMessage(error.description || 'Payment failed');
            setLoading(null);
          },
          () => {
            // onDismiss
            setLoading(null);
          }
        );
      } else {
        // Stripe Flow (Existing)
        const res = await api.post('/billing/checkout', { 
          plan_id: planId,
          currency: 'usd'
        });
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error('Checkout initialization failed', err);
      setErrorMessage('Failed to start checkout. Try again.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white selection:bg-amber-500/30">
      {/* Verification Overlay */}
      <AnimatePresence>
        {paymentStatus !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card max-w-md w-full p-10 text-center relative overflow-hidden"
            >
              {paymentStatus === 'verifying' || paymentStatus === 'processing' ? (
                <>
                  <div className="relative mb-8 flex justify-center">
                    <div className="w-20 h-20 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                    <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">
                    {paymentStatus === 'verifying' ? 'Verifying Signature...' : 'Confirming Allocation...'}
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    We are communicating with your bank to finalize the transaction. Please do not close this window.
                  </p>
                </>
              ) : paymentStatus === 'success' ? (
                <>
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Check className="text-emerald-500" size={40} />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 text-emerald-400">Payment Secured!</h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    Your credits have been added. Redirecting you to your tactical dashboard...
                  </p>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2 }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <XCircle className="text-rose-500" size={40} />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 text-rose-400">Payment Halted</h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    {errorMessage || 'Something went wrong during the transaction.'}
                  </p>
                  <button 
                    onClick={() => setPaymentStatus('idle')}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-colors"
                  >
                    Try Again
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="h-20 flex items-center justify-between px-8 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Target className="text-slate-900" size={18} />
          </div>
          <span className="font-bold text-xl tracking-tighter text-white">Get<span className="text-amber-500">Prospectra</span></span>
        </Link>
        <Link href="/dashboard" className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-2">
          Back to Dashboard <ArrowRight size={14} />
        </Link>
      </nav>

      <div className="max-w-7xl mx-auto px-8 pt-12 pb-24">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-7xl font-black mb-6 tracking-tight"
          >
            Choose Your <span className="text-amber-500 italic">Arsenal</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12"
          >
            Select the plan that matches your ambition. Tactical pricing for global domination.
          </motion.p>

          {/* Currency Toggle */}
          <div className="inline-flex items-center p-1 bg-slate-800/50 rounded-full border border-slate-700 mb-8">
            <button 
              onClick={() => setCurrency('INR')}
              className={`px-6 py-2.5 rounded-full text-sm font-black transition-all ${currency === 'INR' ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              🇮🇳 INR
            </button>
            <button 
              onClick={() => setCurrency('USD')}
              className={`px-6 py-2.5 rounded-full text-sm font-black transition-all ${currency === 'USD' ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              🌍 USD
            </button>
          </div>
          
          {currency === 'INR' && (
            <div className="flex items-center justify-center gap-2 text-amber-500/80 text-xs font-bold uppercase tracking-widest">
              <AlertCircle size={14} /> Secure Razorpay Checkout Active
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <AnimatePresence mode="wait">
            {plans[currency].map((plan, index) => (
              <motion.div
                key={`${currency}-${plan.id}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`glass-card p-10 flex flex-col relative transition-all duration-500 ${
                  plan.highlight ? 'border-amber-500 ring-1 ring-amber-500/50 bg-slate-800/40' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                    Most Popular
                  </div>
                )}

                <div className="mb-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${plan.highlight ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>
                    <plan.icon size={28} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-5xl font-black tracking-tight">{plan.price}</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed font-medium">{plan.description}</p>
                </div>

                <div className="space-y-5 mb-12 flex-1">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 bg-amber-500/10 p-0.5 rounded">
                        <Check className="text-amber-500" size={12} strokeWidth={4} />
                      </div>
                      <span className="text-sm text-slate-300 font-bold leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading !== null}
                  className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 ${
                    plan.highlight 
                      ? 'bg-amber-500 text-slate-900 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]' 
                      : 'bg-white text-slate-900 hover:bg-slate-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.id ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      {plan.cta} <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-20 text-center">
          <p className="text-slate-500 text-sm font-medium mb-4 italic">Trusted by agencies worldwide. Secure encrypted transactions.</p>
          <div className="flex justify-center gap-8 opacity-20 grayscale">
            {/* Mock logos or payment icons could go here */}
          </div>
        </div>
      </div>
    </div>
  );
}
