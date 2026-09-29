import React, { useState, useEffect } from 'react';
import { User, VirtualCard } from '../types';
import { api } from '../services/api';
import { 
  CreditCard, 
  Plus, 
  Lock, 
  Unlock, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Eye, 
  EyeOff, 
  Layers, 
  Check,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles
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
      await api.createVirtualCard({
        cardType,
        category,
        spendingLimit: Number(spendingLimit)
      });
      setSuccessMsg(`Virtual Corporate Card issued successfully with instant active status.`);
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
              <CreditCard className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#00a3e0]">
              Silicon Valley Bank Card Management
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Virtual Corporate Cards & Expense Controls
          </h1>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl">
            Issue instant, 256-bit encrypted Visa & Mastercard corporate cards for vendor disbursements, cloud computing infrastructure, and team expenses.
          </p>
        </div>

        <button
          onClick={() => setShowIssueModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#00a3e0] hover:bg-[#0284c7] text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Issue Virtual Card</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Virtual Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-8 h-8 border-2 border-[#00a3e0] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold">Loading Virtual Cards...</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <CreditCard className="w-12 h-12 text-slate-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900">No Virtual Cards Issued Yet</h3>
            <p className="text-slate-500 text-xs max-w-md mx-auto mt-1">
              Issue your first SVB Virtual Corporate Card to manage online vendor bills and SaaS subscriptions securely.
            </p>
          </div>
          <button
            onClick={() => setShowIssueModal(true)}
            className="px-4 py-2 bg-[#002b49] hover:bg-[#001f35] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            + Issue Virtual Card
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
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-5 hover:shadow-sm transition-shadow"
              >
                {/* Top Card Controls */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#002b49] bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                        {card.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        card.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {card.status}
                      </span>
                    </div>

                    <button
                      onClick={() => toggleDetails(card.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title={isRevealed ? "Hide Card Info" : "Reveal Card Info"}
                    >
                      {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* High-Fidelity Silicon Valley Bank Corporate Card Graphic */}
                  <div className={`aspect-[1.586/1] w-full rounded-2xl p-4.5 sm:p-5 relative overflow-hidden flex flex-col justify-between shadow-md select-none transition-all duration-300 ${
                    card.status === 'Frozen'
                      ? 'bg-gradient-to-br from-[#0c131f] via-[#1a2332] to-[#080d15] border border-slate-700/60 text-slate-200 opacity-90'
                      : 'bg-gradient-to-br from-[#051826] via-[#002b49] to-[#073c64] border border-cyan-400/25 text-white'
                  }`}>
                    {/* Metallic Sheen Lighting Overlays */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Card Header: SVB Branding & Card Category */}
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center font-black text-[9px] tracking-tight text-white shadow-xs">
                          SVB
                        </div>
                        <div>
                          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider block leading-tight text-white">
                            Silicon Valley Bank
                          </span>
                          <span className="text-[8px] font-semibold tracking-wider uppercase block text-cyan-200/80 mt-0.5">
                            {card.cardType || 'Corporate Card'} • {card.category || 'Business'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {card.status === 'Frozen' ? (
                          <span className="px-2 py-0.5 bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-md text-[9px] font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[9px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Golden EMV Chip & Contactless */}
                    <div className="flex items-center gap-3 relative z-10 my-0.5">
                      <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-[#fef08a] via-[#f59e0b] to-[#b45309] border border-yellow-200/70 shadow-xs relative overflow-hidden flex items-center justify-center shrink-0">
                        <div className="absolute inset-0 border-t border-b border-amber-900/35 my-auto h-2.5" />
                        <div className="absolute inset-0 border-l border-r border-amber-900/35 mx-auto w-4" />
                        <div className="w-2.5 h-2 bg-amber-800/25 rounded-xs border border-amber-900/40" />
                      </div>

                      <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M8.5 14.5A4 4 0 0 1 8.5 9.5" strokeLinecap="round" />
                        <path d="M12 17a8 8 0 0 0 0-10" strokeLinecap="round" />
                        <path d="M15.5 19.5a12 12 0 0 0 0-15" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Card Number */}
                    <div className="relative z-10 my-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm sm:text-base tracking-[0.2em] text-white tabular-nums drop-shadow-xs">
                          {maskedNumber}
                        </span>
                        {card.cardNumber && (
                          <button
                            onClick={() => handleCopy(card.cardNumber.replace(/\s+/g, ''), `num-${card.id}`)}
                            className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
                            title="Copy Card Number"
                          >
                            {copiedField === `num-${card.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Expiry, CVV & Holder */}
                    <div className="flex items-end justify-between relative z-10 pt-0.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-3 text-[8px] font-mono tabular-nums text-white/80">
                          <div>
                            <span className="text-[7px] text-white/60 block uppercase font-bold tracking-wider">Valid Thru</span>
                            <span className="font-bold text-white">
                              {card.expiryMonth && card.expiryYear ? `${card.expiryMonth}/${card.expiryYear}` : 'Not available'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[7px] text-white/60 block uppercase font-bold tracking-wider">CVV</span>
                            <span className="font-bold text-white">
                              {isRevealed ? (card.cvv || 'Not available') : '•••'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[7px] text-white/60 block uppercase font-bold tracking-wider">Cardholder Name</span>
                          <span className="font-mono font-bold uppercase text-[11px] tracking-wider block text-white truncate max-w-[170px] sm:max-w-[210px]">
                            {card.cardholderName || user.fullName?.toUpperCase() || 'Not available'}
                          </span>
                        </div>
                      </div>

                      {card.cardType?.includes('Mastercard') ? (
                        <div className="flex items-center -space-x-2 shrink-0">
                          <div className="w-5 h-5 rounded-full bg-rose-600 shadow-sm" />
                          <div className="w-5 h-5 rounded-full bg-amber-500 shadow-sm" />
                        </div>
                      ) : (
                        <div className="font-mono font-black italic text-white text-base tracking-tighter shrink-0 select-none">
                          VISA
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Spending Progress & Card Limits */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Available Spending Limit:</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {card.spendingLimit !== undefined && card.spendingLimit !== null 
                        ? `$${card.spendingLimit.toLocaleString('en-US')} USD` 
                        : 'Not available'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Spent this cycle:</span>
                    <span className="font-mono font-semibold text-slate-700 tabular-nums">
                      {card.spentAmount !== undefined && card.spentAmount !== null
                        ? `$${card.spentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
                        : 'Not available'}
                    </span>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => handleToggleCardStatus(card.id)}
                    className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      card.status === 'Active'
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    {card.status === 'Active' ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Freeze Card</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unfreeze Card</span>
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#00a3e0]" />
                <h2 className="text-base font-bold text-slate-900">Issue SVB Virtual Card</h2>
              </div>
              <button 
                onClick={() => setShowIssueModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleStartCardIssuance} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Card Network & Tier</label>
                <select
                  value={cardType}
                  onChange={e => setCardType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-[#00a3e0] focus:outline-none"
                >
                  <option value="Visa Corporate">Visa Corporate (SVB Titanium Corporate Tier)</option>
                  <option value="Mastercard Executive">Mastercard Business Executive (SVB Executive Virtual Tier)</option>
                  <option value="Visa Purchasing">Visa Purchasing & Procurement (SVB Commercial Tier)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Expense Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:border-[#00a3e0] focus:outline-none"
                >
                  <option value="Business">General Business & Operations</option>
                  <option value="Software Subscriptions">Software & Cloud (AWS, Google Cloud, SaaS)</option>
                  <option value="Marketing">Marketing & Advertising</option>
                  <option value="Travel">Corporate Travel & Lodging</option>
                  <option value="Personal">Personal Expenditures</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Monthly Spending Limit ($ USD)</label>
                <input
                  type="number"
                  min="100"
                  max="100000"
                  step="100"
                  value={spendingLimit}
                  onChange={e => setSpendingLimit(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:border-[#00a3e0] focus:outline-none tabular-nums"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={issuing}
                  className="w-full bg-[#002b49] hover:bg-[#001f35] text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Confirm & Provision Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 30-Second Card Issuance Processing Simulation Modal */}
      {show30sProcessingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-4 shadow-2xl text-slate-900">
            <div className="w-14 h-14 rounded-2xl bg-[#002b49] text-[#00a3e0] flex items-center justify-center mx-auto shadow-md">
              <Clock className="w-7 h-7 animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Generating Secure Card Credentials...
              </h3>
              <p className="text-xs text-slate-500">
                Allocating dedicated 16-digit PAN, CVV, and EMV token with Visa/Mastercard Clearing Core.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Security Provisioning:</span>
                <span className="font-mono text-[#00a3e0] font-bold tabular-nums">{countdownSeconds}s remaining</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-[#00a3e0] h-full rounded-full transition-all duration-1000"
                  style={{ width: `${((30 - countdownSeconds) / 30) * 100}%` }}
                />
              </div>
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={finalizeCardIssuance}
                  className="text-[11px] text-[#00a3e0] hover:text-[#002b49] font-bold underline transition-colors cursor-pointer"
                >
                  Skip timer & activate card instantly →
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>PCI-DSS Level 1 & FDIC Certified Encryption</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
