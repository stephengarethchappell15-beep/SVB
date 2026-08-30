import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { subscribeCryptoAddressesFromFirestore } from '../lib/firebase';
import { ArrowDownLeft, Copy, Check, QrCode, Building2, ShieldCheck, Share2, Globe2, Wallet, Coins } from 'lucide-react';

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
    { label: 'Routing / ABA Number', value: '121000358', key: 'routing' },
    { label: 'SWIFT / BIC Code', value: 'SVBUS33XXX', key: 'swift' },
    { label: 'Bank Address', value: '3000 Sand Hill Rd, Building 4, Menlo Park, CA 94025', key: 'address' }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Receive Funds & Deposit Methods</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                View bank wire details or official treasury deposit wallet addresses to receive funds.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mt-6">
          <button
            onClick={() => setActiveTab('wire')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'wire'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Bank Wire & ACH</span>
          </button>
          <button
            onClick={() => setActiveTab('crypto')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'crypto'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Crypto Deposit Addresses</span>
          </button>
        </div>

        {/* Highlighted Account Number Card */}
        {activeTab === 'wire' && (
          <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Your Unique Account Number
              </span>
              <p className="text-2xl font-mono font-bold text-white mt-1 tracking-wider">{user.accountNumber}</p>
              <p className="text-xs text-slate-400 mt-0.5">Linked directly to {user.email}</p>
            </div>

            <button
              onClick={() => copyToClipboard(user.accountNumber, 'account_top')}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 shrink-0"
            >
              {copiedField === 'account_top' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied Account #</span>
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

      {activeTab === 'wire' ? (
        /* Wiring Details List */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Complete Wire & Domestic ACH Instructions
            </h3>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Globe2 className="w-3 h-3 text-emerald-400" /> USD Domestic & Int'l
            </span>
          </div>

          <div className="space-y-3">
            {wireDetails.map((item) => (
              <div key={item.key} className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">{item.label}</p>
                  <p className="font-semibold text-slate-100 font-mono mt-0.5">{item.value}</p>
                </div>

                <button
                  onClick={() => copyToClipboard(item.value, item.key)}
                  className="p-2 text-slate-400 hover:text-emerald-400 rounded-xl hover:bg-slate-800 transition-colors"
                  title={`Copy ${item.label}`}
                >
                  {copiedField === item.key ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Crypto Deposit Addresses List */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 animate-fadeIn">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              Official SVB Treasury Crypto Deposit Addresses
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Copy the official treasury wallet addresses below to transfer Bitcoin (BTC) or Tether (USDT).
            </p>
          </div>

          <div className="space-y-4">
            {/* Bitcoin BTC Card */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
                    ₿
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Bitcoin (BTC) Treasury Wallet</h4>
                    <p className="text-[10px] text-slate-400">Network: Bitcoin Native (SegWit / Bech32)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
                  Verified Address
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="font-mono text-xs text-amber-400 font-semibold break-all select-all">
                  {cryptoAddresses.BTC}
                </span>

                <button
                  onClick={() => copyToClipboard(cryptoAddresses.BTC, 'btc_deposit')}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-md shadow-amber-500/10"
                >
                  {copiedField === 'btc_deposit' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied BTC Address</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Wallet Address</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tether USDT Card */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    ₮
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Tether (USDT) Treasury Wallet</h4>
                    <p className="text-[10px] text-slate-400">Network: USDT (ERC-20 / TRC-20)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                  Verified Address
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="font-mono text-xs text-emerald-400 font-semibold break-all select-all">
                  {cryptoAddresses.USDT}
                </span>

                <button
                  onClick={() => copyToClipboard(cryptoAddresses.USDT, 'usdt_deposit')}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-md shadow-emerald-500/10"
                >
                  {copiedField === 'usdt_deposit' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied USDT Address</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Wallet Address</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
