import React, { useState, useEffect } from 'react';
import { User, VirtualCard } from '../types';
import { api } from '../services/api';
import { 
  CreditCard, 
  Plus, 
  Lock, 
  Unlock, 
  Shield, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Eye, 
  EyeOff,
  Layers,
  Sparkles,
  Check
} from 'lucide-react';
import { BackButton } from './BackButton';

interface VirtualCardsPanelProps {
  user: User;
  onRefreshUser: () => void;
}

export const VirtualCardsPanel: React.FC<VirtualCardsPanelProps> = ({ user, onRefreshUser }) => {
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState<{ [id: string]: boolean }>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form State for Issuing Card
  const [cardType, setCardType] = useState('Visa Corporate');
  const [category, setCategory] = useState<'Business' | 'Marketing' | 'Software Subscriptions' | 'Travel' | 'Personal'>('Business');
  const [spendingLimit, setSpendingLimit] = useState(50000);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 30-Second Card Issuance Processing Animation State
  const [show30sProcessingModal, setShow30sProcessingModal] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(30);

  const loadCards = async () => {
    try {
      setLoading(true);
      const res = await api.getVirtualCards();
      setCards(res.cards || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  // 30-Second Countdown Timer Effect for Virtual Card Generation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (show30sProcessingModal && countdownSeconds > 0) {
      timer = setInterval(() => {
        setCountdownSeconds(prev => prev - 1);
      }, 1000);
    } else if (show30sProcessingModal && countdownSeconds === 0) {
      // Automatically finalize card creation after 30-second delay
      finalizeCardIssuance();
    }
    return () => clearInterval(timer);
  }, [show30sProcessingModal, countdownSeconds]);

  const handleToggleCardStatus = async (cardId: string) => {
    try {
      await api.toggleVirtualCard(cardId);
      loadCards();
    } catch (err: any) {
      alert(err.message || 'Failed to update card status');
    }
  };

  const handleStartCardIssuance = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setShowIssueModal(false);
    setCountdownSeconds(30);
    setShow30sProcessingModal(true);
  };

  const finalizeCardIssuance = async () => {
    setIssuing(true);
    try {
      const res = await api.createVirtualCard({
        cardType,
        category,
        spendingLimit: Number(spendingLimit)
      });
      setSuccessMsg(`Virtual Card issued successfully with gold metallic tier!`);
      setShow30sProcessingModal(false);
      loadCards();
      onRefreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to issue virtual card.');
      setShow30sProcessingModal(false);
      setShowIssueModal(true);
    } finally {
      setIssuing(false);
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleDetails = (cardId: string) => {
    setShowCardDetails(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
                <Layers className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Silicon Valley Bank Virtual Cards</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Virtual Corporate Card Management</h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Issue instant, secure virtual Visa and Mastercard corporate cards for vendor payments, cloud software subscriptions, ad campaigns, and team expenditures with zero issuance fee.
            </p>
          </div>

          <button
            onClick={() => setShowIssueModal(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Issue New Virtual Card
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Virtual Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-3xl border border-slate-800">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading Virtual Cards...
        </div>
      ) : cards.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-3xl space-y-4">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-white">No Virtual Cards Issued Yet</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mt-1">
              Create your first SVB Virtual Corporate Card to manage online purchases and vendor bill payments securely.
            </p>
          </div>
          <button
            onClick={() => setShowIssueModal(true)}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs"
          >
            Issue Virtual Card Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map(card => {
            const isRevealed = showCardDetails[card.id];
            const maskedNumber = isRevealed 
              ? card.cardNumber 
              : `•••• •••• •••• ${card.cardNumber.slice(-4)}`;

            return (
              <div 
                key={card.id}
                className={`bg-slate-900/80 border ${card.status === 'Frozen' ? 'border-amber-500/30' : 'border-slate-800'} rounded-3xl p-6 shadow-xl relative flex flex-col justify-between space-y-6 hover:border-slate-700 transition-all`}
              >
                {/* Top Card Info */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                        {card.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        card.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {card.status}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleDetails(card.id)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title={isRevealed ? "Hide Card Info" : "Reveal Card Info"}
                    >
                      {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Card Visual Container - Premium Metallic Gold Physical & Virtual Card Design */}
                  <div className={`aspect-[1.586/1] w-full rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-2xl transition-all duration-300 transform hover:scale-[1.02] ${
                    card.status === 'Frozen'
                      ? 'bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 border border-slate-700/50 opacity-80 text-white'
                      : 'bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 border border-yellow-200/80 text-slate-950'
                  }`}>
                    {/* Metallic Gold Light Sheen Beam & Texture Overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/30 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-yellow-200/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0)_60%)] pointer-events-none" />

                    {/* Card Header: SVB Branding & Card Type */}
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-slate-950 text-amber-400 flex items-center justify-center font-extrabold text-[10px] shadow-sm">
                            SVB
                          </div>
                          <span className={`text-[11px] font-black uppercase tracking-widest ${card.status === 'Frozen' ? 'text-white' : 'text-slate-950'} drop-shadow-sm`}>
                            Silicon Valley Bank
                          </span>
                        </div>
                        <span className={`text-[9px] font-semibold tracking-wider uppercase block mt-0.5 ${card.status === 'Frozen' ? 'text-slate-400' : 'text-slate-800'}`}>
                          {card.cardType} • Gold Tier
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {card.status === 'Frozen' ? (
                          <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Frozen
                          </span>
                        ) : (
                          <Shield className="w-4 h-4 text-slate-900 drop-shadow-md" />
                        )}
                      </div>
                    </div>

                    {/* Middle Section: Golden EMV Chip & Contactless Icon */}
                    <div className="flex items-center gap-3 relative z-10 my-1">
                      {/* 3D Golden EMV Chip */}
                      <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-yellow-100 via-amber-300 to-yellow-500 border border-yellow-100 shadow-md relative overflow-hidden flex items-center justify-center shrink-0">
                        {/* Chip Circuit Lines */}
                        <div className="absolute inset-0 border-t border-b border-amber-800/40 my-auto h-2.5" />
                        <div className="absolute inset-0 border-l border-r border-amber-800/40 mx-auto w-4" />
                        <div className="w-2.5 h-2 bg-amber-700/30 rounded-sm border border-amber-800/50" />
                      </div>

                      {/* Contactless Wave Icon */}
                      <svg className={`w-5 h-5 ${card.status === 'Frozen' ? 'text-slate-300' : 'text-slate-900'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M8.5 14.5A4 4 0 0 1 8.5 9.5" strokeLinecap="round" />
                        <path d="M12 17a8 8 0 0 0 0-10" strokeLinecap="round" />
                        <path d="M15.5 19.5a12 12 0 0 0 0-15" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Card Number Display */}
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono font-black text-base sm:text-lg tracking-[0.18em] ${card.status === 'Frozen' ? 'text-white' : 'text-slate-950'} drop-shadow-sm`}>
                          {maskedNumber}
                        </span>
                        {isRevealed && (
                          <button
                            onClick={() => handleCopy(card.cardNumber.replace(/\s+/g, ''), `num-${card.id}`)}
                            className="text-slate-800 hover:text-slate-950 p-1 transition-colors"
                            title="Copy Card Number"
                          >
                            {copiedField === `num-${card.id}` ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Name, Expiry, CVV & Network Logo */}
                    <div className="flex items-end justify-between relative z-10 pt-1">
                      <div className="space-y-0.5">
                        <div className={`flex items-center gap-4 text-[9px] font-mono ${card.status === 'Frozen' ? 'text-slate-300' : 'text-slate-800'}`}>
                          <div>
                            <span className="text-[8px] opacity-75 block tracking-wider uppercase font-semibold">Valid Thru</span>
                            <span className="font-bold">{card.expiryMonth}/{card.expiryYear}</span>
                          </div>
                          <div>
                            <span className="text-[8px] opacity-75 block tracking-wider uppercase font-semibold">CVV</span>
                            <span className="font-bold">{isRevealed ? card.cvv : '•••'}</span>
                          </div>
                        </div>
                        <div>
                          <span className={`text-[8px] opacity-75 block tracking-wider uppercase font-semibold ${card.status === 'Frozen' ? 'text-slate-400' : 'text-slate-800'}`}>Cardholder Name</span>
                          <span className={`font-mono font-extrabold uppercase text-xs tracking-wider block truncate max-w-[180px] ${card.status === 'Frozen' ? 'text-white' : 'text-slate-950'}`}>
                            {card.cardholderName}
                          </span>
                        </div>
                      </div>

                      {/* Payment Network Brand Badge */}
                      {card.cardType.includes('Mastercard') ? (
                        <div className="flex items-center -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-rose-600 shadow-md" />
                          <div className="w-6 h-6 rounded-full bg-amber-500 shadow-md" />
                        </div>
                      ) : (
                        <div className="font-mono font-black italic text-slate-950 text-base sm:text-lg tracking-tighter">
                          VISA
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Spending Progress & Card Limits */}
                <div className="space-y-2 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Daily Spending Limit:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {user.verificationTier === 'Tier 3' || card.spendingLimit >= 50000000 ? '$50,000,000.00' : '$50,000.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Monthly Spending Limit:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {user.verificationTier === 'Tier 3' || card.spendingLimit >= 50000000 ? 'Unlimited' : '$1,000,000.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Spent this period:</span>
                    <span className="font-mono font-semibold text-cyan-400">${card.spentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-cyan-400 h-full rounded-full" 
                      style={{ width: user.verificationTier === 'Tier 3' || card.spendingLimit >= 50000000 ? '1%' : `${Math.min(100, (card.spentAmount / (card.spendingLimit || 50000)) * 100)}%` }} 
                    />
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleToggleCardStatus(card.id)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      card.status === 'Active'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    {card.status === 'Active' ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Freeze Card
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        Unfreeze Card
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Issue SVB Virtual Card</h2>
              </div>
              <button 
                onClick={() => setShowIssueModal(false)}
                className="text-slate-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleStartCardIssuance} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Card Network / Type</label>
                <select
                  value={cardType}
                  onChange={e => setCardType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Visa Corporate">Visa Corporate Platinum (Gold Metallic)</option>
                  <option value="Mastercard Executive">Mastercard Business Executive (Gold Metallic)</option>
                  <option value="Visa Purchasing">Visa Purchasing & Procurement (Gold Metallic)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Expense Category / Purpose</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Business">General Business Operations</option>
                  <option value="Software Subscriptions">Software & Cloud Subscriptions (AWS, Google, SaaS)</option>
                  <option value="Marketing">Digital Marketing & Ads (Meta, Google, LinkedIn Ads)</option>
                  <option value="Travel">Corporate Travel & Lodging</option>
                  <option value="Personal">Personal Purchases</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Monthly Spending Limit ($ USD)</label>
                <input
                  type="number"
                  min="100"
                  max="100000"
                  step="100"
                  value={spendingLimit}
                  onChange={e => setSpendingLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-cyan-500 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Maximum allowed per cycle. Card can be frozen or terminated at any time.</p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuing}
                  className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-yellow-500/20 disabled:opacity-50"
                >
                  Confirm & Issue Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 30-Second Security Card Issuance Processing Screen */}
      {show30sProcessingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-yellow-500/30 rounded-3xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bank Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              <span>SVB Gold Metallic Card Protocol</span>
            </div>

            {/* Countdown Animated Ring */}
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              {/* Outer Pulsing Ring */}
              <div className="absolute inset-0 rounded-full border-4 border-yellow-500/20 animate-ping" />
              {/* Animated Spinner SVG */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-yellow-400 transition-all duration-1000 ease-linear"
                  fill="transparent"
                  strokeDasharray={351.85}
                  strokeDashoffset={351.85 * (1 - countdownSeconds / 30)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {countdownSeconds}s
                </span>
                <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest">
                  Processing
                </span>
              </div>
            </div>

            {/* Dynamic Status Progress Message */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">Generating Gold Metallic Bank Card</h3>
              <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800 animate-pulse">
                {countdownSeconds > 22
                  ? "Step 1/4: Establishing 256-bit secure gateway with Silicon Valley Bank Card Vault..."
                  : countdownSeconds > 14
                  ? "Step 2/4: Allocating 16-Digit PAN & EMV Chip encryption keys with Visa/Mastercard network..."
                  : countdownSeconds > 6
                  ? "Step 3/4: Setting up $5,000 corporate credit limit & automated ledger verification..."
                  : "Step 4/4: Finalizing gold metallic physical & virtual card issuance..."}
              </p>
            </div>

            <p className="text-[11px] text-slate-400">
              Please do not close this window while your card security credentials are being generated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
