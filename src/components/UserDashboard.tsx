import React, { useState, useEffect } from 'react';
import { User, Transaction, UserNotification, VirtualCard, isStatusPending, isStatusApproved, isStatusRejected } from '../types';
import { api } from '../services/api';
import { 
  CreditCard, 
  Copy, 
  Check, 
  ShieldCheck, 
  Bell, 
  Send, 
  X, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight,
  Shield, 
  SlidersHorizontal, 
  MoreVertical, 
  Eye, 
  EyeOff, 
  Lock,
  Unlock,
  Plus,
  Search, 
  Filter, 
  Flame, 
  Plane, 
  Building2, 
  ShieldAlert,
  ArrowLeftRight,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';

interface UserDashboardProps {
  user: User;
  transactions: Transaction[];
  notifications: UserNotification[];
  onOpenReceipt: (txn: Transaction) => void;
  onNavigateTab: (tab: 'dashboard' | 'cards' | 'bills' | 'deposit' | 'withdraw' | 'send' | 'receive' | 'history' | 'profile' | 'settings' | 'support' | 'admin') => void;
  onNavigateToAdmin?: () => void;
  onUserUpdated?: (updatedUser: User) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  transactions,
  notifications,
  onOpenReceipt,
  onNavigateTab,
  onNavigateToAdmin,
  onUserUpdated
}) => {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedRouting, setCopiedRouting] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showBulletinsModal, setShowBulletinsModal] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [userCards, setUserCards] = useState<VirtualCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [copiedCardNum, setCopiedCardNum] = useState(false);
  const [togglingCard, setTogglingCard] = useState(false);

  const handleToggleCardStatus = async (cardId: string) => {
    try {
      setTogglingCard(true);
      const res = await api.toggleVirtualCard(cardId);
      setUserCards(prev => prev.map(c => c.id === cardId ? res.card : c));
    } catch (err: any) {
      console.error('Failed to toggle card status:', err);
    } finally {
      setTogglingCard(false);
    }
  };

  // Load Virtual Cards for main dashboard view
  useEffect(() => {
    let isMounted = true;
    api.getVirtualCards().then(res => {
      if (isMounted) {
        setUserCards(res.cards || []);
      }
    }).catch(err => {
      console.warn('Failed loading virtual cards on dashboard:', err);
    }).finally(() => {
      if (isMounted) setCardsLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  // Live timestamp generator
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      };
      setCurrentTimeStr(now.toLocaleDateString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const copyAccountNumber = () => {
    navigator.clipboard.writeText(user.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const copyRoutingNumber = () => {
    navigator.clipboard.writeText('121141822');
    setCopiedRouting(true);
    setTimeout(() => setCopiedRouting(false), 2000);
  };

  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: user.currency || 'USD'
  }).format(Number(user.balance) || 0);

  const formattedLedgerBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: user.currency || 'USD'
  }).format(Number(user.ledgerBalance !== undefined ? user.ledgerBalance : user.balance) || 0);

  return (
    <div className="space-y-6 text-slate-800 font-sans pb-10">

      {/* Top Welcome Institutional Banner */}
      <div className="bg-[#002b49] rounded-2xl p-5 sm:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#0b1723]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00a3e0]">
              Silicon Valley Bank Commercial
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-300 font-medium">
              Core Clearing: Operational
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Welcome back, {user.fullName}
          </h1>
          <p className="text-xs text-slate-300 font-mono">
            {currentTimeStr || 'Apr 14, 2026 at 5:54 PM PDT'}
          </p>
        </div>

        {/* Security Bulletin Alert Button */}
        <button
          onClick={() => setShowBulletinsModal(true)}
          className="bg-[#0b1d2e] hover:bg-[#132d44] border border-[#1d3d5a] text-white rounded-xl px-4 py-2.5 flex items-center gap-3 transition-all text-xs font-semibold shadow-xs shrink-0 text-left cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Bell className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-slate-200">Security Bulletin</span>
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              Phishing Protection & BEC Advisory
            </p>
          </div>
        </button>
      </div>

      {/* Bulletins Security Modal */}
      {showBulletinsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full space-y-4 shadow-2xl relative text-slate-800">
            <button
              onClick={() => setShowBulletinsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close bulletin"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#002b49]">Cybersecurity & Fraud Advisories</h3>
                <p className="text-xs text-slate-500">Silicon Valley Bank Information Security Office</p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <p className="font-bold text-amber-900">Critical Phishing & BEC Protection</p>
                <p>Silicon Valley Bank personnel will never request your 4-digit security code, online banking password, or wire authorization tokens via unauthenticated SMS or voice calls.</p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-[#002b49]">Commercial Wire Protocols</p>
                <p>All outgoing wire transfers and vendor bill disbursements undergo dual-factor cryptographic validation and 256-bit SSL transaction clearing.</p>
              </div>
            </div>
            <button
              onClick={() => setShowBulletinsModal(false)}
              className="w-full bg-[#002b49] hover:bg-[#001f35] text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* Account Details & Balances Banner */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 sm:p-6 transition-shadow hover:shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          
          {/* Account Title & Holder Name */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#002b49] text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm border border-slate-800">
              SVB
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Primary Commercial Checking
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-semibold flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Account (FDIC Insured)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {user.fullName}
              </h2>
            </div>
          </div>

          {/* Account Number, Routing Number, Creation Date, Available Balance Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-100">
            
            {/* Account Number */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-500 block tracking-wider">
                Account Number
              </span>
              <div className="flex items-center justify-between gap-1.5 mt-1">
                <span className="font-mono font-bold text-sm text-slate-900 tracking-wider tabular-nums">
                  {user.accountNumber}
                </span>
                <button
                  onClick={copyAccountNumber}
                  className="p-1 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Copy Account Number"
                >
                  {copiedAccount ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {copiedAccount ? (
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Copied!</span>
              ) : (
                <span className="text-[10px] text-slate-400 block mt-0.5">SVB Core Account</span>
              )}
            </div>

            {/* Routing Number */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-500 block tracking-wider">
                Routing / Wire ABA
              </span>
              <div className="flex items-center justify-between gap-1.5 mt-1">
                <span className="font-mono font-bold text-sm text-slate-900 tracking-wider tabular-nums">
                  121141822
                </span>
                <button
                  onClick={copyRoutingNumber}
                  className="p-1 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Copy Routing Number"
                >
                  {copiedRouting ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {copiedRouting ? (
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Copied!</span>
              ) : (
                <span className="text-[10px] text-slate-400 block mt-0.5">Fedwire / ACH</span>
              )}
            </div>

            {/* Verification Status */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-500 block tracking-wider">
                Verification Tier
              </span>
              <span className="font-bold text-xs text-slate-900 block mt-1">
                {user.verificationTier || 'Tier 3 VIP Verified'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Full Wire Limits
              </span>
            </div>

            {/* Available Balance with Privacy Eye Toggle */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500 block tracking-wider">
                  Available Balance
                </span>
                <button
                  onClick={() => setHideBalance(!hideBalance)}
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={hideBalance ? 'Show Balance' : 'Hide Balance'}
                >
                  {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 block mt-1 font-mono tabular-nums">
                {hideBalance ? '••••••••' : formattedBalance}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Settled Funds
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* Quick Banking Actions Toolbar */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            Quick Actions
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-xs text-slate-500 font-medium hidden md:inline">
            Direct access to outgoing transfers, bill pay, virtual cards, and wire settlement
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onNavigateTab('send')}
            className="flex-1 sm:flex-none bg-[#002b49] hover:bg-[#001f35] text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-cyan-300" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={() => onNavigateTab('bills')}
            className="flex-1 sm:flex-none bg-[#002b49] hover:bg-[#001f35] text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-cyan-300" />
            <span>Pay Bills</span>
          </button>

          <button
            onClick={() => onNavigateTab('withdraw')}
            className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Wire</span>
          </button>

          <button
            onClick={() => onNavigateTab('cards')}
            className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-600" />
            <span>Virtual Cards</span>
          </button>

          <button
            onClick={() => onNavigateTab('receive')}
            className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Receive</span>
          </button>
        </div>
      </div>

      {/* Grid of Interactive Banking Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Primary Corporate Bank Card Widget */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800">Primary Bank Card</h2>
                {cardsLoading ? (
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Checking...
                  </span>
                ) : userCards.length > 0 ? (
                  userCards[0].status === 'Active' ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    No Card Issued
                  </span>
                )}
              </div>
              <button 
                onClick={() => onNavigateTab('cards')} 
                className="text-xs text-[#00a3e0] hover:text-[#002b49] font-semibold transition-colors cursor-pointer"
              >
                Card Settings →
              </button>
            </div>

            {/* Card Body Rendering */}
            {cardsLoading ? (
              <div className="aspect-[1.586/1] w-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center border border-slate-200">
                <CreditCard className="w-8 h-8 text-slate-300" />
              </div>
            ) : userCards.length === 0 ? (
              /* Safe Empty State: No Invented Card Data */
              <div className="aspect-[1.586/1] w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-5 flex flex-col items-center justify-center text-center space-y-2.5">
                <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-400">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">No Active Card Provisioned</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mt-0.5 leading-relaxed">
                    You do not currently have an active physical or virtual card provisioned on this account.
                  </p>
                </div>
                <button
                  onClick={() => onNavigateTab('cards')}
                  className="px-3.5 py-1.5 bg-[#002b49] hover:bg-[#001f35] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Issue Virtual Card</span>
                </button>
              </div>
            ) : (() => {
              const activeCard = userCards[0];
              const isMastercard = (activeCard.cardType || '').toLowerCase().includes('mastercard');
              const isFrozen = activeCard.status === 'Frozen';

              return (
                <div>
                  {/* High-Fidelity Silicon Valley Bank Corporate Card Graphic */}
                  <div className={`aspect-[1.586/1] w-full rounded-2xl p-4.5 sm:p-5 relative overflow-hidden flex flex-col justify-between shadow-md select-none transition-all duration-300 ${
                    isFrozen
                      ? 'bg-gradient-to-br from-[#0c131f] via-[#1a2332] to-[#080d15] border border-slate-700/60 text-slate-200 opacity-90'
                      : 'bg-gradient-to-br from-[#051826] via-[#002b49] to-[#073c64] border border-cyan-400/25 text-white'
                  }`}>
                    {/* Metallic Lighting Overlays */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Top Row: SVB Branding & Category */}
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
                            {activeCard.cardType || 'Corporate Card'} • {activeCard.category || 'Business'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {userCards.length > 1 && (
                          <span className="text-[9px] font-bold bg-white/15 text-white px-2 py-0.5 rounded-full border border-white/10">
                            1 of {userCards.length}
                          </span>
                        )}
                        <Shield className={`w-3.5 h-3.5 ${isFrozen ? 'text-amber-400' : 'text-cyan-300'}`} />
                      </div>
                    </div>

                    {/* Middle Row: Golden EMV Chip & Contactless */}
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

                    {/* Card Number Section */}
                    <div className="relative z-10 my-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm sm:text-base tracking-[0.2em] text-white tabular-nums drop-shadow-xs">
                          {showCardDetails 
                            ? activeCard.cardNumber 
                            : (activeCard.cardNumber 
                                ? `•••• •••• •••• ${activeCard.cardNumber.replace(/\s+/g, '').slice(-4)}` 
                                : '•••• •••• •••• ••••')}
                        </span>
                        {activeCard.cardNumber && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeCard.cardNumber.replace(/\s+/g, ''));
                              setCopiedCardNum(true);
                              setTimeout(() => setCopiedCardNum(false), 2000);
                            }}
                            className="p-1 text-white/70 hover:text-white transition-colors cursor-pointer"
                            title="Copy Card Number"
                          >
                            {copiedCardNum ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Expiry, CVV, Cardholder Name & Brand Logo */}
                    <div className="flex items-end justify-between relative z-10 pt-0.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-3 text-[8px] font-mono tabular-nums text-white/80">
                          <div>
                            <span className="text-[7px] text-white/60 block uppercase font-bold tracking-wider">Valid Thru</span>
                            <span className="font-bold text-white">
                              {activeCard.expiryMonth && activeCard.expiryYear ? `${activeCard.expiryMonth}/${activeCard.expiryYear}` : 'Not available'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[7px] text-white/60 block uppercase font-bold tracking-wider">CVV</span>
                            <span className="font-bold text-white">
                              {showCardDetails ? (activeCard.cvv || 'Not available') : '•••'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[7px] text-white/60 block uppercase font-bold tracking-wider">Cardholder Name</span>
                          <span className="font-mono font-bold uppercase text-[11px] tracking-wider block text-white truncate max-w-[170px] sm:max-w-[210px]">
                            {activeCard.cardholderName || user.fullName?.toUpperCase() || 'Not available'}
                          </span>
                        </div>
                      </div>

                      {/* Brand Logo */}
                      {isMastercard ? (
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

                  {/* Spending Limit info from authentic backend data */}
                  <div className="flex items-center justify-between text-[11px] pt-3 text-slate-600">
                    <span className="font-medium text-slate-500">Available Spending Limit:</span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums">
                      {activeCard.spendingLimit !== undefined && activeCard.spendingLimit !== null
                        ? `$${activeCard.spendingLimit.toLocaleString('en-US')} USD`
                        : 'Not available'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3 text-xs font-semibold text-slate-700">
            {userCards.length > 0 ? (
              <>
                <button 
                  onClick={() => setShowCardDetails(!showCardDetails)} 
                  className="hover:text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer text-slate-600"
                >
                  {showCardDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showCardDetails ? 'Hide Details' : 'Reveal Details'}</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleCardStatus(userCards[0].id)}
                    disabled={togglingCard}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      userCards[0].status === 'Frozen'
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {userCards[0].status === 'Frozen' ? (
                      <>
                        <Unlock className="w-3 h-3 text-emerald-600" />
                        <span>Unfreeze</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-slate-600" />
                        <span>Freeze</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => onNavigateTab('cards')} 
                    className="text-[#002b49] hover:text-[#00a3e0] transition-colors cursor-pointer font-bold"
                  >
                    Manage Cards
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-[11px] text-slate-400 font-medium">Spending Limit: No information available</span>
                <button 
                  onClick={() => onNavigateTab('cards')} 
                  className="text-[#002b49] hover:text-[#00a3e0] transition-colors cursor-pointer font-bold"
                >
                  + Issue Virtual Card
                </button>
              </>
            )}
          </div>
        </div>

        {/* Cash Runway & Treasury Baseline Widget */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <h2 className="text-sm font-bold text-slate-800">Cash Runway & Liquidity</h2>
              <button
                onClick={() => onNavigateTab('history')}
                className="text-xs text-[#00a3e0] hover:text-[#002b49] font-semibold transition-colors cursor-pointer"
              >
                Ledger →
              </button>
            </div>

            <div>
              <p className="text-[11px] text-slate-500">Total Liquid Treasury Balance</p>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5 font-mono tabular-nums">
                {hideBalance ? '••••••••' : formattedBalance}
              </div>

              <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase">Burn Rate (90D)</p>
                    <p className="font-bold text-slate-900 font-mono tabular-nums">$0.00 USD</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <Plane className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase">Runway Projected</p>
                    <p className="font-bold text-slate-900">{user.balance > 0 ? 'Infinite' : '0 Months'}</p>
                  </div>
                </div>
              </div>

              {/* Historical Balance Curve */}
              <div className="relative h-20 w-full mt-2 flex flex-col justify-end">
                {user.balance > 0 ? (
                  <svg className="w-full h-16" viewBox="0 0 300 90" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="softSlateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00a3e0" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#00a3e0" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0,75 Q 75,80 150,55 T 270,25 L 300,30 L 300,90 L 0,90 Z" fill="url(#softSlateGradient)" />
                    <path d="M 0,75 Q 75,80 150,55 T 270,25 L 300,30" fill="none" stroke="#00a3e0" strokeWidth="2.5" />
                  </svg>
                ) : (
                  <svg className="w-full h-12" viewBox="0 0 300 40" preserveAspectRatio="none">
                    <line x1="0" y1="20" x2="300" y2="20" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                  </svg>
                )}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-1 font-mono">
                  <span>Start Cycle</span>
                  <span>Present Settlement</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-3 text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span className="text-slate-500">Ledger Balance:</span>
            <span className="font-bold text-slate-900 font-mono tabular-nums">
              {hideBalance ? '••••••••' : formattedLedgerBalance}
            </span>
          </div>
        </div>

      </div>

      {/* Recent Transactions Feed */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 sm:p-6 hover:shadow-sm transition-shadow">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Account Activity</h2>
            <p className="text-xs text-slate-500">Official posted and pending transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onNavigateTab('history')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search Records</span>
            </button>
            <button 
              onClick={() => onNavigateTab('history')}
              className="text-xs text-[#00a3e0] hover:text-[#002b49] font-semibold transition-colors cursor-pointer"
            >
              View Full History →
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {transactions.length > 0 ? (
            transactions.slice(0, 5).map((t) => (
              <div 
                key={t.id} 
                onClick={() => onOpenReceipt(t)}
                title="Click to view official transaction slip & receipt"
                className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    t.type === 'Deposit' || t.type === 'Credit'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {t.type === 'Deposit' || t.type === 'Credit' ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-xs text-slate-900 group-hover:text-[#00a3e0] transition-colors">
                        {t.description}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isStatusApproved(t.status)
                          ? 'bg-emerald-100 text-emerald-800'
                          : isStatusPending(t.status)
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                      <span>{new Date(t.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>Ref #{t.reference || t.id.slice(0, 10)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-mono font-bold text-sm block tabular-nums ${
                    t.type === 'Deposit' || t.type === 'Credit' ? 'text-emerald-700' : 'text-slate-900'
                  }`}>
                    {t.type === 'Deposit' || t.type === 'Credit' ? '+' : '-'}
                    {(Number(t.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t.currency || 'USD'}
                  </span>
                  <span className="text-[10px] text-[#00a3e0] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    View Slip →
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-slate-500">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold">No recent transactions recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Transactions will appear here when posted to your account.</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-3 mt-2 text-center">
          <button 
            onClick={() => onNavigateTab('history')} 
            className="text-xs font-semibold text-[#002b49] hover:text-[#00a3e0] transition-colors cursor-pointer"
          >
            Open Complete Transaction Ledger & Statement Downloads →
          </button>
        </div>
      </div>

    </div>
  );
};
