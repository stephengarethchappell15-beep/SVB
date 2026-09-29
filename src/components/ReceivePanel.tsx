import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { subscribeCryptoAddressesFromFirestore } from '../lib/firebase';
import { ArrowDownLeft, Copy, Check, Building2, ShieldCheck, Share2, Wallet, Coins, FileText, Printer } from 'lucide-react';
import { BackButton } from './BackButton';

interface ReceivePanelProps {
  user: User;
}

export const ReceivePanel: React.FC<ReceivePanelProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'wire' | 'crypto'>('wire');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [cryptoAddresses, setCryptoAddresses] = useState<{ BTC: string; USDT: string }>({
    BTC: '1Fy9Up78qVeawXCLnAqcnRJrvjiXLJF21d',
    USDT: '0x400773d018e8ad3575458b5e8b11ff55078451c9'
  });

  useEffect(() => {
    api.getCryptoAddresses()
      .then(res => {
        if (res.addresses) {
          setCryptoAddresses(res.addresses);
        }
      })
      .catch(console.error);

    const unsub = subscribeCryptoAddressesFromFirestore((addrs) => {
      setCryptoAddresses(prev => ({ ...prev, ...addrs }));
    });

    const handleWindowUpdate = (e: any) => {
      if (e.detail) setCryptoAddresses(prev => ({ ...prev, ...e.detail }));
    };
    window.addEventListener('crypto-addresses-updated', handleWindowUpdate);

    return () => {
      unsub();
      window.removeEventListener('crypto-addresses-updated', handleWindowUpdate);
    };
  }, []);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const wireDetails = [
    { label: 'Bank Name', value: 'Silicon Valley Bank (SVB), N.A.', key: 'bank' },
    { label: 'Account Holder Name', value: user.fullName, key: 'name' },
    { label: 'Account Number', value: user.accountNumber, key: 'account' },
    { label: 'Routing / Wire ABA Number', value: '121141822', key: 'routing' },
    { label: 'ACH Routing Number', value: '121141822', key: 'ach_routing' },
    { label: 'SWIFT / BIC Code', value: 'SVBUS33XXX', key: 'swift' },
    { label: 'Bank Address', value: '3000 Sand Hill Rd, Building 4, Menlo Park, CA 94025', key: 'address' }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>

      {/* Top Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#002b49] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            <ArrowDownLeft className="w-6 h-6 text-[#00a3e0]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Receive Funds & Inbound Routing</h2>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Official Silicon Valley Bank wire instructions and institutional treasury settlement details.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mt-5">
          <button
            onClick={() => setActiveTab('wire')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'wire'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-[#00a3e0]" />
            <span>Bank Wire & ACH</span>
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'crypto'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4 text-[#00a3e0]" />
            <span>Crypto Treasury</span>
          </button>
        </div>

        {/* Account Number Spotlight */}
        {activeTab === 'wire' && (
          <div className="mt-4 p-4 rounded-xl bg-[#002b49] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00a3e0]">
                SVB Commercial Account Number
              </span>
              <p className="text-2xl font-mono font-extrabold text-white mt-0.5 tracking-wider tabular-nums">
                {user.accountNumber}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                Primary Account Holder: <span className="font-semibold text-white">{user.fullName}</span>
              </p>
            </div>

            <button
              onClick={() => copyToClipboard(user.accountNumber, 'account_top')}
              className="w-full sm:w-auto bg-[#00a3e0] hover:bg-[#0284c7] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {copiedField === 'account_top' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Account #</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Wire Details List */}
      {activeTab === 'wire' ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00a3e0]" />
              Wire Transfer Instructions (Domestic & International)
            </h3>
            <button
              onClick={() => window.print()}
              className="text-xs text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {wireDetails.map((detail) => (
              <div key={detail.key} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase text-slate-500">{detail.label}</p>
                  <p className="font-mono text-sm font-bold text-slate-900 mt-0.5 truncate tabular-nums">
                    {detail.value}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(detail.value, detail.key)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedField === detail.key ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-900">Clearing Timelines & Notice</p>
            <p>Domestic Fedwire transfers typically clear within 1-2 hours during federal banking windows. Standard ACH credits clear within 1 business day.</p>
          </div>
        </div>
      ) : (
        /* Crypto Treasury Tab */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#00a3e0]" />
              Official Institutional Treasury Deposit Wallets
            </h3>
          </div>

          {/* Bitcoin Address */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                  ₿
                </span>
                <span className="font-bold text-xs text-slate-900">Bitcoin (BTC) Treasury</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">Native SegWit / Legacy</span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200">
              <span className="font-mono text-xs font-bold text-slate-900 break-all tabular-nums">
                {cryptoAddresses.BTC}
              </span>
              <button
                onClick={() => copyToClipboard(cryptoAddresses.BTC, 'btc')}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 cursor-pointer"
              >
                {copiedField === 'btc' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* USDT Address */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  ₮
                </span>
                <span className="font-bold text-xs text-slate-900">Tether USD (USDT)</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">ERC-20 (Ethereum Network)</span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200">
              <span className="font-mono text-xs font-bold text-slate-900 break-all tabular-nums">
                {cryptoAddresses.USDT}
              </span>
              <button
                onClick={() => copyToClipboard(cryptoAddresses.USDT, 'usdt')}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 cursor-pointer"
              >
                {copiedField === 'usdt' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <p className="font-bold">Important Network Verification</p>
            <p>Ensure transactions are routed strictly to the designated network (BTC or ERC-20). Deposits automatically reconcile to your USD ledger upon 3 blockchain confirmations.</p>
          </div>
        </div>
      )}

      {/* Trust Marker Footer */}
      <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>FDIC Insured • Silicon Valley Bank Core Clearing</span>
      </div>
    </div>
  );
};
