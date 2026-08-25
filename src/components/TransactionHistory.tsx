import React, { useState } from 'react';
import { Transaction } from '../types';
import { maskAccountNumber } from '../utils/masking';
import { 
  History, 
  Search, 
  Download, 
  FileText, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle 
} from 'lucide-react';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onOpenReceipt: (txn: Transaction) => void;
  isAdmin: boolean;
  onBack?: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  onOpenReceipt,
  isAdmin
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');

  const filtered = transactions.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      t.reference.toLowerCase().includes(q) ||
      t.accountNumber.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.recipientName && t.recipientName.toLowerCase().includes(q)) ||
      (isAdmin && (t.userEmail.toLowerCase().includes(q) || (t.createdByAdminEmail && t.createdByAdminEmail.toLowerCase().includes(q))));

    const matchesCurrency = currencyFilter === 'ALL' || t.currency === currencyFilter;

    return matchesQuery && matchesCurrency;
  });

  const exportToCSV = () => {
    if (filtered.length === 0) return;

    const headers = ['Date', 'Reference', 'User Email', 'Account Number', 'Amount', 'Currency', 'Type', 'Status', 'Description', 'Processed By SVB Review'];
    const rows = filtered.map(t => [
      `"${new Date(t.createdAt).toLocaleString()}"`,
      `"${t.reference}"`,
      `"${t.userEmail}"`,
      `"${t.accountNumber}"`,
      t.amount,
      `"${t.currency}"`,
      `"${t.type}"`,
      `"${t.status}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.createdByAdminEmail || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Transaction_Records_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isCreditTxn = (txn: Transaction) => {
    const type = (txn.type || '').toLowerCase();
    const desc = (txn.description || '').toLowerCase();
    return (
      type.includes('credit') ||
      type.includes('deposit') ||
      type.includes('received') ||
      desc.includes('credit') ||
      desc.includes('deposit') ||
      desc.includes('incoming') ||
      desc.includes('received') ||
      desc.includes('activation')
    );
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Transaction Records & Audit History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin ? 'System-wide transaction records across all accounts' : 'Deposit and transaction history for your account'}
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={filtered.length === 0}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors self-start md:self-auto shrink-0 shadow-sm"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Export CSV ({filtered.length})
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ref, email, acc #, description..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Currency Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 font-medium whitespace-nowrap">Currency:</span>
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Currencies</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="NGN">NGN (₦)</option>
          </select>
        </div>

      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
        {filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl p-6">
            <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">
              {searchQuery || currencyFilter !== 'ALL' ? 'No matching transaction records found' : 'No transactions yet.'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || currencyFilter !== 'ALL' ? 'Try adjusting your search terms or filter settings.' : 'Your incoming and outgoing transaction records will appear here.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
            <table className="w-full min-w-[760px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3 w-40 whitespace-nowrap">Date & Time</th>
                  <th className="pb-3 px-3 w-36 whitespace-nowrap">Reference</th>
                  {isAdmin && <th className="pb-3 px-3 w-44 whitespace-nowrap">Target Account</th>}
                  <th className="pb-3 px-3 min-w-[180px]">Description</th>
                  <th className="pb-3 px-3 w-24 whitespace-nowrap">Type</th>
                  <th className="pb-3 px-3 w-36 whitespace-nowrap">Amount</th>
                  <th className="pb-3 px-3 w-28 whitespace-nowrap">Status</th>
                  <th className="pb-3 px-3 w-24 text-right whitespace-nowrap">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap">
                      {new Date(txn.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-emerald-400 font-semibold whitespace-nowrap">
                      {txn.reference}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <p className="font-semibold text-white">{txn.userEmail}</p>
                        <p className="font-mono text-[10px] text-slate-400">Acc #{maskAccountNumber(txn.accountNumber)}</p>
                      </td>
                    )}
                    <td className="py-3.5 px-3 text-slate-200 font-medium">
                      {txn.description}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {txn.type}
                      </span>
                    </td>
                    <td className={`py-3.5 px-3 font-bold text-sm whitespace-nowrap ${
                      isCreditTxn(txn) ? 'text-emerald-400' : 'text-slate-200'
                    }`}>
                      {isCreditTxn(txn) ? '+' : '-'}${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {txn.currency || 'USD'}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        txn.status === 'Completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : txn.status === 'Pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {txn.status === 'Completed' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : txn.status === 'Pending' ? (
                          <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-400" />
                        )}
                        {txn.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onOpenReceipt(txn)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 text-[11px] font-medium inline-flex items-center gap-1 shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
