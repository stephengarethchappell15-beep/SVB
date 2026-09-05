import React, { useState, useEffect } from 'react';
import { User, Transaction, UserNotification, VirtualCard } from '../types';
import { api } from '../services/api';
import { 
  CreditCard, 
  Copy, 
  Check, 
  ShieldCheck, 
  ArrowDownRight, 
  TrendingUp, 
  Bell, 
  QrCode, 
  Mail, 
  Phone, 
  FileText, 
  Sparkles,
  Key,
  DollarSign,
  Send,
  X,
  AlertCircle,
  Receipt,
  Layers,
  ArrowUpRight,
  Shield,
  SlidersHorizontal,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Search,
  Filter,
  Flame,
  Plane,
  Building2,
  Calendar,
  ExternalLink,
  Award,
  ListFilter,
  ShieldAlert
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
  const [copied, setCopied] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showBulletinsModal, setShowBulletinsModal] = useState(false);
  const [userCards, setUserCards] = useState<VirtualCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [copiedCardNum, setCopiedCardNum] = useState(false);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: user.currency || 'USD'
  }).format(Number(user.balance) || 0);

  // Pending items count for Task List widget
  const pendingTxns = transactions.filter(t => t.status === 'Pending');
  const taskCount = pendingTxns.length > 0 ? pendingTxns.length : 2;

  return (
    <div className="space-y-5 text-slate-800 font-sans">

      {/* Top Welcome Banner */}
      <div className="bg-[#0f2232] rounded-lg p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Welcome to SVB Go</h1>
          <p className="text-xs text-slate-300 mt-0.5 font-medium">
            {currentTimeStr || 'Apr 14, 2025 at 5:54 PM PDT'}
          </p>
        </div>

        {/* Bulletin Alert Banner */}
        <button
          onClick={() => setShowBulletinsModal(true)}
          className="bg-[#153147] hover:bg-[#1b3c57] border border-[#234b6c] text-white rounded-lg px-3.5 py-2 flex items-center gap-2.5 transition-all text-xs font-semibold shadow-sm shrink-0 text-left"
        >
          <Bell className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex items-center gap-2">
            <span>Increased Risk of Phishing and Hacking</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-200 underline font-semibold hover:text-white">View Bulletins</span>
          </div>
        </button>
      </div>

      {/* Bulletins Security Modal */}
      {showBulletinsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full space-y-4 shadow-2xl relative text-slate-800">
            <button
              onClick={() => setShowBulletinsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#002b49]">Security & Fraud Bulletins</h3>
                <p className="text-xs text-slate-500">Silicon Valley Bank Cybersecurity Advisory</p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1">
                <p className="font-bold text-amber-900">Critical Phishing & BEC Warning</p>
                <p>Silicon Valley Bank will never ask for your 2FA security codes, online credentials, or wire approvals over phone calls or unsolicited text messages.</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="font-bold text-[#002b49]">Transaction Security Standards</p>
                <p>All Global ACH and International Wires are processed with multi-layer token authorization and real-time fraud monitoring protocols.</p>
              </div>
            </div>
            <button
              onClick={() => setShowBulletinsModal(false)}
              className="w-full bg-[#002b49] text-white font-bold py-2 rounded-xl text-xs hover:bg-[#001f35]"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* Account Details Display Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4.5 sm:p-5 hover:shadow-md transition-shadow">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Account Title & Account Holder Name */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#0f2232] text-amber-400 flex items-center justify-center font-black text-sm shrink-0 shadow-sm border border-slate-800">
              SVB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  Account Name
                </span>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Account
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {user.fullName}
              </h2>
            </div>
          </div>

          {/* Account Number, Routing Number, and Balance Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            
            {/* Account Number */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-500 block tracking-wider">
                Account Number
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono font-black text-sm text-slate-900 tracking-wider">
                  {user.accountNumber}
                </span>
                <button
                  onClick={copyAccountNumber}
                  className="p-1 text-slate-500 hover:text-slate-900 transition-colors"
                  title="Copy Account Number"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {copied && (
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Copied to clipboard!</span>
              )}
            </div>

            {/* Routing Number */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase text-slate-500 block tracking-wider">
                Routing / Wire ABA
              </span>
              <span className="font-mono font-bold text-sm text-slate-900 tracking-wider block mt-1">
                121141822
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Silicon Valley Bank</span>
            </div>

            {/* Available Balance */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 block tracking-wider">
                Available Balance
              </span>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 block mt-1">
                {formattedBalance}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Primary Checking</span>
            </div>

          </div>

        </div>
      </div>

      {/* Quick Banking Operations Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            Quick Actions
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-xs text-slate-500 font-medium hidden md:inline">
            Fast access for outgoing transfers, vendor bill pay, and card management
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => onNavigateTab('send')}
            className="flex-1 sm:flex-none bg-[#0f2232] hover:bg-[#0b1723] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Send className="w-3.5 h-3.5 text-slate-300" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={() => onNavigateTab('bills')}
            className="flex-1 sm:flex-none bg-[#0f2232] hover:bg-[#0b1723] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-300" />
            <span>Pay Bills</span>
          </button>

          <button
            onClick={() => onNavigateTab('withdraw')}
            className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Wire</span>
          </button>

          <button
            onClick={() => onNavigateTab('cards')}
            className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-600" />
            <span>Issue Card</span>
          </button>
        </div>
      </div>

      {/* Grid Layout of Dashboard Widget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* Widget 1: Card Program Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4.5 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h2 className="text-sm font-bold text-slate-800">Card Program</h2>
              <div className="flex items-center gap-2 text-slate-400">
                <button className="hover:text-slate-600"><SlidersHorizontal className="w-3.5 h-3.5" /></button>
                <button className="hover:text-slate-600"><MoreVertical className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-800">Innovators Card Program</h3>
              
              <div className="pt-1">
                <p className="text-[11px] text-slate-500 font-medium">Current Balance</p>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  $0.00 <span className="text-xs font-semibold text-slate-500">USD</span>
                </div>
                <div className="h-0.5 w-full bg-slate-200 rounded mt-1 mb-2"></div>
                <p className="text-xs text-slate-600">
                  Available Credit <span className="font-bold text-slate-900">$0.00 USD</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Payment Due</p>
                  <p className="font-bold text-slate-900 text-sm">$0.00 <span className="text-[10px]">USD</span></p>
                  <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                    No active balance due
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Rewards</p>
                  <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                    🏆 0 <span className="text-[10px]">PTS</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 text-xs font-semibold text-slate-700">
            <button onClick={() => onNavigateTab('cards')} className="hover:text-slate-900 underline decoration-slate-300">View Cards</button>
            <button onClick={() => onNavigateTab('bills')} className="hover:text-slate-900 underline decoration-slate-300">Make a Payment</button>
          </div>
        </div>

        {/* Widget 2: Realistic Bank Card View */}
        {(() => {
          const activeCard: VirtualCard = userCards[0] || {
            id: 'CARD-PRIMARY',
            cardNumber: '4829 8492 0184 1088',
            cardholderName: (user.fullName || 'ACCOUNT HOLDER').toUpperCase(),
            expiryMonth: '08',
            expiryYear: '30',
            cvv: '382',
            cardType: 'Visa Corporate',
            category: 'Business',
            spendingLimit: user.verificationTier === 'Tier 3' ? 50000000 : 50000,
            spentAmount: 0,
            status: 'Active',
            createdAt: new Date().toISOString()
          };

          const isMastercard = activeCard.cardType?.includes('Mastercard');

          return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4.5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-800">Primary Bank Card</h2>
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <button onClick={() => onNavigateTab('cards')} title="Manage Cards" className="hover:text-slate-600">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onNavigateTab('cards')} title="More Options" className="hover:text-slate-600">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Realistic Physical / Virtual Bank Card Graphic */}
                <div className={`aspect-[1.586/1] w-full rounded-2xl p-4.5 relative overflow-hidden flex flex-col justify-between shadow-lg transition-all duration-300 ${
                  activeCard.status === 'Frozen'
                    ? 'bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 border border-slate-700/50 text-white opacity-85'
                    : 'bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 border border-yellow-200/80 text-slate-950'
                }`}>
                  {/* Metallic Sheen & Lighting Effects */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-200/30 rounded-full blur-2xl pointer-events-none" />

                  {/* Top Row: SVB Branding & Card Type */}
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded bg-slate-950 text-amber-400 flex items-center justify-center font-black text-[9px] shadow-sm">
                          SVB
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${activeCard.status === 'Frozen' ? 'text-white' : 'text-slate-950'}`}>
                          Silicon Valley Bank
                        </span>
                      </div>
                      <span className={`text-[8px] font-semibold tracking-wider uppercase block mt-0.5 ${activeCard.status === 'Frozen' ? 'text-slate-400' : 'text-slate-800'}`}>
                        {activeCard.cardType} • Gold Tier
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {userCards.length > 1 && (
                        <span className="text-[9px] font-bold bg-slate-950/20 text-slate-950 px-2 py-0.5 rounded-full border border-slate-950/10">
                          1 of {userCards.length}
                        </span>
                      )}
                      <Shield className={`w-3.5 h-3.5 ${activeCard.status === 'Frozen' ? 'text-amber-400' : 'text-slate-950'}`} />
                    </div>
                  </div>

                  {/* Middle Row: Golden EMV Chip & Contactless Icon */}
                  <div className="flex items-center gap-3 relative z-10 my-0.5">
                    {/* 3D Golden EMV Chip */}
                    <div className="w-9 h-6 rounded-md bg-gradient-to-tr from-yellow-100 via-amber-300 to-yellow-500 border border-yellow-100 shadow-md relative overflow-hidden flex items-center justify-center shrink-0">
                      <div className="absolute inset-0 border-t border-b border-amber-800/40 my-auto h-2" />
                      <div className="absolute inset-0 border-l border-r border-amber-800/40 mx-auto w-3.5" />
                      <div className="w-2 h-1.5 bg-amber-700/30 rounded-sm border border-amber-800/50" />
                    </div>

                    {/* Contactless Wave Signal Icon */}
                    <svg className={`w-4 h-4 ${activeCard.status === 'Frozen' ? 'text-slate-300' : 'text-slate-950'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M8.5 14.5A4 4 0 0 1 8.5 9.5" strokeLinecap="round" />
                      <path d="M12 17a8 8 0 0 0 0-10" strokeLinecap="round" />
                      <path d="M15.5 19.5a12 12 0 0 0 0-15" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Card Number Section */}
                  <div className="relative z-10 my-0.5">
                    <div className="flex items-center justify-between">
                      <span className={`font-mono font-black text-sm sm:text-base tracking-[0.16em] ${activeCard.status === 'Frozen' ? 'text-white' : 'text-slate-950'}`}>
                        {showCardDetails 
                          ? activeCard.cardNumber 
                          : `${activeCard.cardNumber.slice(0, 4)} •••• •••• ${activeCard.cardNumber.slice(-4)}`}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeCard.cardNumber.replace(/\s+/g, ''));
                          setCopiedCardNum(true);
                          setTimeout(() => setCopiedCardNum(false), 2000);
                        }}
                        className="p-1 text-slate-900 hover:text-black transition-colors"
                        title="Copy Card Number"
                      >
                        {copiedCardNum ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Card Footer: Expiry, CVV, Cardholder Name & Brand Logo */}
                  <div className="flex items-end justify-between relative z-10 pt-0.5">
                    <div className="space-y-0.5">
                      <div className={`flex items-center gap-3 text-[8px] font-mono ${activeCard.status === 'Frozen' ? 'text-slate-300' : 'text-slate-900'}`}>
                        <div>
                          <span className="text-[7px] opacity-75 block uppercase font-semibold">Valid Thru</span>
                          <span className="font-bold">{activeCard.expiryMonth}/{activeCard.expiryYear}</span>
                        </div>
                        <div>
                          <span className="text-[7px] opacity-75 block uppercase font-semibold">CVV</span>
                          <span className="font-bold">{showCardDetails ? activeCard.cvv : '•••'}</span>
                        </div>
                      </div>
                      <div>
                        <span className={`text-[7px] opacity-75 block uppercase font-semibold ${activeCard.status === 'Frozen' ? 'text-slate-400' : 'text-slate-900'}`}>Cardholder Name</span>
                        <span className={`font-mono font-black uppercase text-[11px] tracking-wider block truncate max-w-[160px] ${activeCard.status === 'Frozen' ? 'text-white' : 'text-slate-950'}`}>
                          {activeCard.cardholderName}
                        </span>
                      </div>
                    </div>

                    {/* Brand Logo: Mastercard or Visa */}
                    {isMastercard ? (
                      <div className="flex items-center -space-x-2 shrink-0">
                        <div className="w-5 h-5 rounded-full bg-rose-600 shadow-sm" />
                        <div className="w-5 h-5 rounded-full bg-amber-500 shadow-sm" />
                      </div>
                    ) : (
                      <div className="font-mono font-black italic text-slate-950 text-base tracking-tighter shrink-0">
                        VISA
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Info Bar below graphic */}
                <div className="flex items-center justify-between text-[11px] pt-3 text-slate-600">
                  <span>Spending Limit:</span>
                  <span className="font-bold text-slate-900">
                    ${activeCard.spendingLimit ? activeCard.spendingLimit.toLocaleString() : '50,000'} USD
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3 text-xs font-semibold text-slate-700">
                <button 
                  onClick={() => setShowCardDetails(!showCardDetails)} 
                  className="hover:text-slate-900 flex items-center gap-1 underline decoration-slate-300"
                >
                  {showCardDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showCardDetails ? 'Hide Details' : 'Reveal Details'}</span>
                </button>
                <button onClick={() => onNavigateTab('cards')} className="hover:text-slate-900 underline decoration-slate-300">
                  {userCards.length > 0 ? 'Manage All Cards' : '+ Issue Virtual Card'}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Widget 3: Account Balances Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4.5 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h2 className="text-sm font-bold text-slate-800">Account Balances</h2>
              <div className="flex items-center gap-2 text-slate-400">
                <button className="hover:text-slate-600"><SlidersHorizontal className="w-3.5 h-3.5" /></button>
                <button className="hover:text-slate-600"><MoreVertical className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="pb-2.5">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <div>
                    <p className="font-extrabold text-slate-900 text-sm">{user.fullName}</p>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      Account #{user.accountNumber}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    SVB Primary Checking
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 mt-2.5">
                  <span>Available Balance</span>
                  <span className="font-extrabold text-slate-900">{formattedBalance}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px] mt-0.5">
                  <span>Prior Day Balance</span>
                  <span>{formattedBalance}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center border-t border-slate-100 pt-3 mt-3 text-xs font-semibold text-slate-700">
            <button onClick={() => onNavigateTab('dashboard')} className="hover:text-slate-900 underline decoration-slate-300">View All Accounts</button>
          </div>
        </div>

        {/* Widget 4: Cash Balance Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4.5 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <h2 className="text-sm font-bold text-slate-800">Cash Balance</h2>
              <div className="flex items-center gap-2 text-slate-400">
                <button className="hover:text-slate-600"><SlidersHorizontal className="w-3.5 h-3.5" /></button>
                <button className="hover:text-slate-600"><MoreVertical className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-slate-500">Total Available Balance</p>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
                {formattedBalance}
              </div>

              <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200/80">
                  <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-[9px] text-slate-500 font-semibold">Burn Rate (90 Days)</p>
                    <p className="font-bold text-slate-900">$0.00 USD</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200/80">
                  <Plane className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <p className="text-[9px] text-slate-500 font-semibold">Runway</p>
                    <p className="font-bold text-slate-900">{user.balance > 0 ? 'N/A' : '0 Months'}</p>
                  </div>
                </div>
              </div>

              {/* Historical Balance Baseline */}
              <div className="relative h-20 w-full mt-2 flex flex-col justify-end">
                {user.balance > 0 ? (
                  <svg className="w-full h-16" viewBox="0 0 300 90" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="softSlateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284c7" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0,75 Q 75,80 150,55 T 270,25 L 300,30 L 300,90 L 0,90 Z" fill="url(#softSlateGradient)" />
                    <path d="M 0,75 Q 75,80 150,55 T 270,25 L 300,30" fill="none" stroke="#0284c7" strokeWidth="2" />
                  </svg>
                ) : (
                  <svg className="w-full h-12" viewBox="0 0 300 40" preserveAspectRatio="none">
                    <line x1="0" y1="20" x2="300" y2="20" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                  </svg>
                )}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-1">
                  <span>Start</span>
                  <span>Current</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 5: Transactions Feed Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4.5 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h2 className="text-sm font-bold text-slate-800">Transactions</h2>
              <div className="flex items-center gap-2 text-slate-400">
                <button className="hover:text-slate-600"><Search className="w-3.5 h-3.5" /></button>
                <button className="hover:text-slate-600"><Filter className="w-3.5 h-3.5" /></button>
                <button className="hover:text-slate-600"><MoreVertical className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {transactions.length > 0 ? (
                transactions.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-400">
                          {new Date(t.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                          (t.status === 'Completed' || t.status === 'Approved')
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : t.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800 mt-0.5">{t.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block">
                        {(Number(t.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-500">
                  <p className="text-xs font-semibold">No recent transactions recorded</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Transactions will appear here when posted to your account.</p>
                </div>
              )}
            </div>
          </div>

          <div className="text-center border-t border-slate-100 pt-3 mt-3 text-xs font-semibold text-slate-700">
            <button onClick={() => onNavigateTab('history')} className="hover:text-slate-900 underline decoration-slate-300">View All Transactions</button>
          </div>
        </div>

      </div>

      {/* Footer Branding Trademark Notice */}
      <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-1">
        <p>© 2026 First-Citizens Bank & Trust Company. All rights reserved. SVB, SILICON VALLEY BANK, SVB PRIVATE and the chevron device trademarks of SVB Financial Group.</p>
      </div>

    </div>
  );
};
