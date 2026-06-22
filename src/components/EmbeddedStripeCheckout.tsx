import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { X, CreditCard, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

interface EmbeddedStripeCheckoutProps {
  publishableKey: string;
  clientSecret: string;
  ticketData: any;
  language: 'pt-BR' | 'en';
  onClose: () => void;
}

const CheckoutForm: React.FC<{
  ticketData: any;
  language: 'pt-BR' | 'en';
  onClose: () => void;
}> = ({ ticketData, language, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const returnUrl = `${window.location.origin}/api/payment/success-intent?ticketData=${encodeURIComponent(JSON.stringify(ticketData))}`;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setErrorMessage(error.message || "Erro no pagamento");
      } else {
        setErrorMessage("Ocorreu um erro inesperado ao processar seu pagamento.");
      }
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <PaymentElement options={{ layout: 'accordion' }} />
      
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-start gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="uppercase">{errorMessage}</span>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer font-mono border border-white/5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {language === 'pt-BR' ? 'Cancelar' : 'Cancel'}
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 py-3 bg-[var(--brand-color)] hover:bg-[var(--brand-hover)] text-[#07090E] rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer font-mono active:scale-95 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{language === 'pt-BR' ? 'PROCESSANDO...' : 'PROCESSING...'}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{language === 'pt-BR' ? 'PAGAR SINAL' : 'PAY DEPOSIT'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export const EmbeddedStripeCheckout: React.FC<EmbeddedStripeCheckoutProps> = ({
  publishableKey,
  clientSecret,
  ticketData,
  language,
  onClose
}) => {
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    if (publishableKey) {
      setStripePromise(loadStripe(publishableKey));
    }
  }, [publishableKey]);

  if (!stripePromise) {
    return (
      <div className="fixed inset-0 bg-[#07090E]/95 flex items-center justify-center p-5 z-[10000] backdrop-blur-md font-mono text-center">
        <div className="bg-[#101622] border-2 border-[var(--brand-color)]/20 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-color)] mx-auto" />
          <p className="text-gray-400 text-xs uppercase tracking-wider">
            {language === 'pt-BR' ? 'Carregando gateway...' : 'Loading payment gateway...'}
          </p>
        </div>
      </div>
    );
  }

  // Get dynamic brand primary color from style variables
  const computedBrandColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-color').trim() || '#00E396';

  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: computedBrandColor,
      colorBackground: '#101622',
      colorText: '#ffffff',
      colorDanger: '#df1b41',
      fontFamily: 'JetBrains Mono, Courier New, monospace',
      spacingUnit: '4px',
      borderRadius: '12px',
    },
  };

  return (
    <div className="fixed inset-0 bg-[#07090E]/95 flex items-center justify-center p-5 z-[10000] backdrop-blur-md font-mono text-center overflow-y-auto">
      <div className="bg-[#101622] border-2 border-[var(--brand-color)]/20 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-[#080B11] p-1.5 rounded-full border border-white/5 cursor-pointer transition animate-none z-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 bg-[var(--brand-color)]/10 rounded-2xl flex items-center justify-center mx-auto border border-[var(--brand-color)]/25">
          <CreditCard className="w-6 h-6 text-[var(--brand-color)]" />
        </div>

        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            {language === 'pt-BR' ? 'PAGAMENTO DA RESERVA' : 'RESERVATION PAYMENT'}
          </h3>
          <p className="text-gray-400 text-[10px] uppercase mt-1 font-bold">
            {language === 'pt-BR'
              ? `Valor do Sinal: £${ticketData?.prepaidAmount?.toFixed(2)}`
              : `Deposit amount: £${ticketData?.prepaidAmount?.toFixed(2)}`}
          </p>
        </div>

        <div className="bg-[#080B11] p-3 rounded-xl border border-white/5 text-left text-[11px] text-gray-300 space-y-1">
          <p className="font-bold text-white uppercase">{language === 'pt-BR' ? 'CLIENTE:' : 'CLIENT:'} {ticketData?.name}</p>
          <p className="uppercase text-gray-400 text-[9px]">
            {language === 'pt-BR' ? 'Método Seguro via Stripe Elements com carteiras digitais' : 'Secure Stripe Elements gateway with digital wallets'}
          </p>
        </div>

        <div className="border border-white/5 p-4 rounded-2xl bg-[#080B11]/50 text-left">
          <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
            <CheckoutForm ticketData={ticketData} language={language} onClose={onClose} />
          </Elements>
        </div>

        <div className="text-[8px] text-gray-500 uppercase leading-normal">
          {language === 'pt-BR'
            ? 'Seu pagamento de sinal é processado com segurança pela Stripe. O valor restante será pago na barbearia.'
            : 'Your deposit is securely processed by Stripe. The remaining amount will be paid at the barbershop.'}
        </div>
      </div>
    </div>
  );
};
