import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Transaction, DepositPayload } from '../types';
import { 
  Sparkles, 
  Search, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  DollarSign, 
  FileText, 
  RefreshCw, 
  ShieldCheck, 
  ArrowRight,
  Printer,
  Hash,
  Mail,
  Lock
} from 'lucide-react';
import { BackButton } from './BackButton';

interface AdminDepositPanelProps {
  currentUser: User;
  preselectedUser?: User | null;
  onDepositSuccess: (updatedUser: User, transaction: Transaction) => void;
  onOpenReceipt?: (txn: Transaction) => void;
}

export const AdminDepositPanel: React.FC<AdminDepositPanelProps> = ({
  currentUser,
  preselectedUser,
  onDepositSuccess,
  onOpenReceipt
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(preselectedUser || null);

  // Form states
  const [userEmail, setUserEmail] = useState(preselectedUser ? preselectedUser.email : '');
  const [accountNumber, setAccountNumber] = useState(preselectedUser ? preselectedUser.accountNumber : '');

  useEffect(() => {
    if (preselectedUser) {
      setSelectedUser(preselectedUser);
      setUserEmail(preselectedUser.email);
      setAccountNumber(preselectedUser.accountNumber);
    }
  }, [preselectedUser]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [senderName, setSenderName] = useState('Federal Wire Transfer / SVB Treasury');
  const [description, setDescription] = useState('Standard Account Balance Deposit');
  const [reference, setReference] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ updatedUser: User; transaction: Transaction } | null>(null);

  // Auto-generate transaction reference on mount or refresh
  const generateReference = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setReference(`TXN-DEP-${today}-${rand}`);
  };

  useEffect(() => {
    generateReference();
  }, []);

  // Handle user search input
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchUsers(searchQuery);
        setSearchResults(res.users);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = (u: User) => {
    setSelectedUser(u);
    setUserEmail(u.email);
    setAccountNumber(u.accountNumber);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessResult(null);

    if (!userEmail && !accountNumber) {
      setError('Please provide a target User Email or Account Number.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive deposit amount.');
      return;
    }

    setLoading(true);

    try {
      const payload: DepositPayload = {
        userEmail: userEmail.trim(),
        accountNumber: accountNumber.trim(),
        amount: numAmount,
        currency,
        senderName: senderName.trim(),
        description: description.trim(),
        reference: reference.trim()
      };

      const res = await api.createDeposit(payload);
      setSuccessResult({ updatedUser: res.updatedUser, transaction: res.transaction });
      onDepositSuccess(res.updatedUser, res.transaction);

      // Reset form
      setAmount('');
      generateReference();
    } catch (err: any) {
      setError(err.message || 'Failed to execute deposit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton variant="admin" />
      </div>
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">SVB Review Deposit Management</h1>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                  AUTHORIZED SVB REVIEW
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deposit funds directly into registered user accounts by email or account number
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SVB Review: {currentUser.email}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Search & Selection Column (1 col) */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-400" />
              1. Search User Account
            </h2>

            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email, name or acc #..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            </div>

            {/* Dropdown Auto-Complete Results */}
            {searchResults.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-800 mb-3">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className="w-full text-left p-2.5 hover:bg-slate-800/80 transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{u.fullName}</p>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                      #{u.accountNumber}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected User Info Preview */}
            {selectedUser ? (
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Selected Target</span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {selectedUser.id}</span>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{selectedUser.fullName}</p>
                  <p className="text-slate-400">{selectedUser.email}</p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-300">
                  <span>Account Number:</span>
                  <span className="font-mono text-emerald-400 font-bold">#{selectedUser.accountNumber}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Current Balance:</span>
                  <span className="font-bold text-white">${selectedUser.balance.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic text-center py-4 bg-slate-950/40 rounded-xl border border-slate-800/40">
                Type an email or account number above to select a registered user.
              </p>
            )}
          </div>
        </div>

        {/* Deposit Entry Form Column (2 cols) */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              2. Deposit Entry Details
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDeposit} className="space-y-4 text-xs">
              
              {/* Row 1: Email & Account Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    User Email Address <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="e.g. alex.wright@example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Unique Account Number <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="1084920148"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Amount & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    Deposit Amount <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="NGN">NGN (₦)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Sender Name & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Sender / Originator Full Name <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Acme Corp Treasury / John Doe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Deposit Purpose / Description</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Monthly Allowance, Investment Return, Grant Deposit"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Row 4: Transaction Reference */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Transaction Reference Code</label>
                  <button
                    type="button"
                    onClick={generateReference}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate Ref
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Processing Deposit & Updating Balance...' : 'Execute SVB Review Deposit Entry'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Success Confirmation Card */}
            {successResult && (
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-fadeIn space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Deposit Successfully Executed & Recorded</span>
                  </div>
                  <button
                    onClick={() => onOpenReceipt(successResult.transaction)}
                    className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-400 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    View Receipt
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 pt-2 border-t border-emerald-500/20">
                  <div>
                    <span className="text-[10px] text-slate-400 block">User Credited</span>
                    <span className="font-semibold text-white">{successResult.updatedUser.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Account Number</span>
                    <span className="font-mono font-bold text-emerald-400">#{successResult.updatedUser.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Amount Added</span>
                    <span className="font-bold text-emerald-400">+${successResult.transaction.amount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Updated Balance</span>
                    <span className="font-bold text-white">${successResult.updatedUser.balance.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
