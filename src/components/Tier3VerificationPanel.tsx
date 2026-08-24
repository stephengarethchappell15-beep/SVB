import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { subscribeCryptoAddressesFromFirestore } from '../lib/firebase';
import { ShieldCheck, Upload, FileText, CheckCircle2, Clock, AlertCircle, MapPin, Globe, Sparkles, DollarSign, X, Check, Copy, ArrowRight, Wallet } from 'lucide-react';

interface Tier3VerificationPanelProps {
  user: User;
  onUserUpdated: (updatedUser: User) => void;
}

interface AcceptedDoc {
  type: 'Passport' | 'National ID Card' | "Driver's License" | 'Residence Permit';
  label: string;
}

const COUNTRY_DOCS: Record<string, AcceptedDoc[]> = {
  'United States': [
    { type: "Driver's License", label: "US State Driver's License" },
    { type: 'Passport', label: 'United States Passport' },
    { type: 'National ID Card', label: 'Real ID / SSN Card' },
  ],
  'United Kingdom': [
    { type: 'Passport', label: 'UK Passport' },
    { type: "Driver's License", label: 'UK Photocard Driving Licence' },
    { type: 'National ID Card', label: 'CitizenCard / UK National ID' },
  ],
  'Nigeria': [
    { type: 'Passport', label: 'International Passport' },
    { type: 'National ID Card', label: 'NIN Digital Slip' },
    { type: 'Residence Permit', label: 'Voter Card (PVC)' },
    { type: "Driver's License", label: "Driver's License" },
  ],
  'Canada': [
    { type: 'Passport', label: 'Canadian Passport' },
    { type: "Driver's License", label: "Provincial Driver's License" },
    { type: 'National ID Card', label: 'Provincial Photo ID Card' },
  ],
  'Germany': [
    { type: 'National ID Card', label: 'Personalausweis (National ID)' },
    { type: "Driver's License", label: 'EU Driving Licence' },
    { type: 'Passport', label: 'Reisepass (Passport)' },
  ],
  'United Arab Emirates': [
    { type: 'National ID Card', label: 'Emirates ID Card' },
    { type: 'Passport', label: 'UAE Passport' },
    { type: 'Residence Permit', label: 'Resident Visa ID' },
  ],
  'Australia': [
    { type: 'Passport', label: 'Australian Passport' },
    { type: "Driver's License", label: "Driver's Licence" },
    { type: 'National ID Card', label: 'Medicare / Proof of Age Card' },
  ],
  'Other / Global': [
    { type: 'Passport', label: 'International Passport' },
    { type: 'National ID Card', label: 'National Identity Card' },
    { type: "Driver's License", label: 'Official Driver\'s License' },
  ]
};

export const Tier3VerificationPanel: React.FC<Tier3VerificationPanelProps> = ({ user, onUserUpdated }) => {
  const [address, setAddress] = useState(user.address || '');
  const [country, setCountry] = useState(user.country || 'United States');
  const [selectedDocLabel, setSelectedDocLabel] = useState<string>('');
  const [documentType, setDocumentType] = useState<'Passport' | 'National ID Card' | "Driver's License" | 'Residence Permit'>('Passport');
  
  // File state
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [previewName, setPreviewName] = useState<string>('');
  const [paymentSlipUrl, setPaymentSlipUrl] = useState<string>('');
  const [paymentSlipName, setPaymentSlipName] = useState<string>('');
  const [txHash, setTxHash] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Upgrade Modal Steps: 'prompt' -> 'addresses' -> 'uploadSlip'
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalStep, setModalStep] = useState<'prompt' | 'addresses' | 'uploadSlip'>('prompt');
  const [cryptoMethod, setCryptoMethod] = useState<'BTC' | 'USDT'>('BTC');
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

  const availableDocs = COUNTRY_DOCS[country] || COUNTRY_DOCS['Other / Global'];

  useEffect(() => {
    if (availableDocs.length > 0) {
      setDocumentType(availableDocs[0].type);
      setSelectedDocLabel(availableDocs[0].label);
    }
  }, [country]);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleIdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMsg({ type: 'error', text: 'Identity document image size must be under 5MB.' });
        return;
      }
      setPreviewName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSlipFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Payment slip image size must be under 5MB.');
        return;
      }
      setPaymentSlipName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentSlipUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartUpgrade = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!address.trim()) {
      setMsg({ type: 'error', text: 'Full residential address is required.' });
      return;
    }

    if (!documentUrl) {
      setMsg({ type: 'error', text: 'Please upload a photo of your selected identity document.' });
      return;
    }

    // Step 1: Open $5,000 Deposit Screen directly
    setModalStep('addresses');
    setShowUpgradeModal(true);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSlipUrl) {
      alert('Please upload your $5,000 deposit payment slip screenshot.');
      return;
    }

    try {
      setLoading(true);
      await api.submitTier3Verification({
        address: address.trim(),
        country,
        documentType,
        documentUrl,
        paymentSlipUrl,
        txHash: txHash.trim() || undefined
      });

      setMsg({
        type: 'success',
        text: 'Your Tier 3 VIP upgrade application and $5,000 deposit payment slip have been submitted successfully for compliance review.'
      });
      setShowUpgradeModal(false);
      const updatedSnap = await api.getMe();
      onUserUpdated(updatedSnap.user);
    } catch (err: any) {
      alert(err.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const isTier3 = user.verificationTier === 'Tier 3';
  const isPending = user.verificationTier === 'Pending Tier 3';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              isTier3 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                : (isPending ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30')
            }`}>
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Tier 3 VIP Account Upgrade</h2>
                <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                  isTier3 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                    : (isPending ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30')
                }`}>
                  {user.verificationTier || 'Tier 1'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isTier3 
                  ? 'Your account has achieved Tier 3 Unlimited VIP Status.' 
                  : (isPending ? 'Your verification documents & payment slip are under compliance review.' : 'Upgrade to Tier 3 for unlimited wire transfer limits and institutional treasury clearance.')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs ${
          msg.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {isTier3 ? (
        <div className="bg-slate-900/60 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Tier 3 VIP Upgrade Completed</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Tier 3 Status Active • Daily Spending Limit: $50,000,000.00 • Monthly Limit: Unlimited. You enjoy high-volume wire limits, priority treasury services, and zero transaction holds.
          </p>
        </div>
      ) : isPending ? (
        <div className="bg-slate-900/60 border border-amber-500/30 rounded-3xl p-8 text-center space-y-3">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30 shadow-lg shadow-amber-500/10">
            <Clock className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-white">Tier 3 Upgrade Pending Review</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Your identity document and $5,000 deposit slip have been received. Bank compliance is reviewing your request.
          </p>
        </div>
      ) : (
        <form onSubmit={handleStartUpgrade} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Complete Tier 3 Identity Verification
            </h3>
            <span className="text-[10px] text-slate-400 font-mono font-bold">Step 1 of 2</span>
          </div>

          {/* Full Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Full Residential Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="100 Technology Way, Suite 400, Palo Alto, CA 94301"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none"
                required
              />
            </div>
          </div>

          {/* Country Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Country of Residence</label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
              >
                {Object.keys(COUNTRY_DOCS).map(c => (
                  <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Accepted Document Types for Selected Country */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300">
                Accepted ID Types for <span className="text-cyan-400 font-bold">{country}</span>
              </label>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
                Official Government Issuances
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {availableDocs.map((doc) => {
                const isSelected = selectedDocLabel === doc.label;
                return (
                  <button
                    key={doc.label}
                    type="button"
                    onClick={() => {
                      setDocumentType(doc.type);
                      setSelectedDocLabel(doc.label);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 font-bold shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold">{doc.label}</p>
                      <p className="text-[10px] text-slate-500">{doc.type}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload ID Document */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Upload <span className="text-cyan-400">{selectedDocLabel || documentType}</span> Photo / Scan
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 text-center transition-colors bg-slate-950/50">
              <input
                type="file"
                accept="image/*"
                onChange={handleIdFileUpload}
                id="doc-upload"
                className="hidden"
              />
              <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    {previewName ? `Attached: ${previewName}` : `Click to attach photo of ID Card`}
                  </p>
                  <p className="text-[10px] text-slate-500">PNG, JPG, or WEBP up to 5MB</p>
                </div>
              </label>

              {documentUrl && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Identity Document Attached
                  </p>
                  {documentUrl.startsWith('data:image') && (
                    <img src={documentUrl} alt="ID Preview" className="mt-2 h-28 mx-auto rounded-xl object-cover border border-slate-700 shadow-md" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="submit"
            disabled={!documentUrl}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all text-xs disabled:opacity-50"
          >
            <span>Continue to Upgrade Deposit ($5,000)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Tier 3 $5,000 Upgrade Deposit Flow Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* STEP 1: Prompt Modal */}
            {modalStep === 'prompt' && (
              <div className="space-y-6 text-center py-2">
                <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                  <DollarSign className="w-8 h-8" />
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">
                    Tier 3 VIP Upgrade Protocol
                  </span>
                  <h3 className="text-xl font-bold text-white">Tier 3 VIP Account Upgrade Requirement</h3>
                  <p className="text-sm text-slate-200 font-semibold leading-relaxed p-4 bg-slate-950 rounded-2xl border border-cyan-500/30">
                    "Kindly deposit $5,000 for the upgrade and successful transaction."
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed px-2">
                    Once your $5,000 deposit is verified along with your identity document, your account will be upgraded to Tier 3 Unlimited VIP status and $5,000 will be credited to your available balance.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalStep('addresses')}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Proceed to Deposit Addresses</span>
                </button>
              </div>
            )}

            {/* STEP 2: Payment Addresses */}
            {modalStep === 'addresses' && (
              <div className="space-y-5 text-xs">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">$5,000 Upgrade Treasury Deposit Addresses</h3>
                    <p className="text-xs text-slate-400">Select network & copy deposit address</p>
                  </div>
                </div>

                {/* Crypto Selection */}
                <div>
                  <label className="block font-semibold text-slate-300 mb-2">Select Payment Currency</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCryptoMethod('BTC')}
                      className={`p-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        cryptoMethod === 'BTC' ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      Bitcoin (BTC)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCryptoMethod('USDT')}
                      className={`p-2.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        cryptoMethod === 'USDT' ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      Tether (USDT)
                    </button>
                  </div>
                </div>

                {/* Deposit Address Box */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Required Upgrade Amount:</span>
                    <span className="font-bold text-cyan-400 text-sm">$5,000.00 USD</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Treasury Address ({cryptoMethod}) — Click/Tap to Copy:</span>
                    <div
                      onClick={() => copyAddress(walletAddresses[cryptoMethod] || walletAddresses['USDT'] || walletAddresses['BTC'])}
                      className="cursor-pointer hover:border-cyan-500/50 flex items-center gap-2 bg-slate-900 p-3 rounded-xl border border-slate-800 transition-all group"
                    >
                      <span className="font-mono text-cyan-400 font-semibold text-xs break-all flex-1 select-all">
                        {walletAddresses[cryptoMethod] || walletAddresses['USDT'] || walletAddresses['BTC']}
                      </span>
                      <div className="p-1.5 bg-slate-800 group-hover:bg-cyan-500 group-hover:text-slate-950 text-slate-200 rounded-lg shrink-0 flex items-center gap-1 text-[10px] font-bold transition-all">
                        {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAddress ? 'Copied!' : 'Copy'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalStep('uploadSlip')}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I Have Transferred</span>
                </button>
              </div>
            )}

            {/* STEP 3: Upload Payment Slip & Submit */}
            {modalStep === 'uploadSlip' && (
              <form onSubmit={handleFinalSubmit} className="space-y-4 text-xs">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Upload $5,000 Payment Slip / Proof</h3>
                    <p className="text-xs text-slate-400">Upload screenshot of completed deposit</p>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Attached ID Document</label>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 font-medium">{selectedDocLabel || documentType} ({country})</span>
                    <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ID Card Ready
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Upload Payment Slip / Screenshot *</label>
                  <div className="relative border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 text-center bg-slate-950 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSlipFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {paymentSlipUrl ? (
                      <div className="space-y-2">
                        <img src={paymentSlipUrl} alt="Payment Slip" className="max-h-32 mx-auto rounded-xl border border-slate-700 object-cover" />
                        <p className="text-emerald-400 text-[11px] font-semibold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Payment Slip Attached: {paymentSlipName}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-400">
                        <Upload className="w-6 h-6 mx-auto text-cyan-400" />
                        <p className="text-xs font-semibold text-slate-200">Tap or click to select $5,000 deposit slip screenshot</p>
                        <p className="text-[10px] text-slate-500">PNG, JPG, or WEBP up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Transaction Hash / Ref (Optional)</label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="e.g. 0x8a91f... or TXN-9401"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalStep('addresses')}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl text-xs transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !paymentSlipUrl}
                    className="w-2/3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-xl text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Submit Tier 3 Application</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
