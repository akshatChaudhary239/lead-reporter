import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: any) => void;
  prefill: {
    name: string;
    email: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

export const useRazorpay = () => {
  const [isScriptLoading, setIsScriptLoading] = useState(false);

  const loadScript = useCallback(() => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        setIsScriptLoading(false);
        resolve(true);
      };
      script.onerror = () => {
        setIsScriptLoading(false);
        resolve(false);
      };
      setIsScriptLoading(true);
      document.body.appendChild(script);
    });
  }, []);

  const openCheckout = useCallback(async (
    options: Omit<RazorpayOptions, 'handler' | 'modal'>,
    onSuccess: (response: any) => void,
    onFailure: (error: any) => void,
    onDismiss: () => void
  ) => {
    const res = await loadScript();
    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      return;
    }

    const rzp = new (window as any).Razorpay({
      ...options,
      handler: onSuccess,
      modal: {
        ondismiss: onDismiss,
      },
    });

    rzp.on('payment.failed', (response: any) => {
      onFailure(response.error);
    });

    rzp.open();
  }, [loadScript]);

  return { openCheckout, isScriptLoading };
};
