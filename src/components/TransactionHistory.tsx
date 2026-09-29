import React, { useState } from 'react';
import { Transaction, isStatusPending, isStatusApproved, isStatusRejected } from '../types';
import { 
  History, 
  Search, 
  Download, 
  FileText, 
  Filter, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowUpRight,
  ShieldCheck,
  Send,
  Building2
} from 'lucide-react';
import { BackButton } from './BackButton';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onOpenReceipt: (txn: Transaction) => void;
  isAdmin: boolean;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  onOpenReceipt,
  isAdmin
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Wire' | 'Deposit' | 'Bill' | 'Pending'>('ALL');

  const filtered = transactions.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      (t.reference || '').toLowerCase().includes(q) ||
      (t.accountNumber || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.recipientName && t.recipientName.toLowerCase().includes(q)) ||
      (isAdmin && (((t.userEmail || '').toLowerCase().includes(q)) || (t.createdByAdminEmail && t.createdByAdminEmail.toLowerCase().includes(q))));

    const matchesCurrency = currencyFilter === 'ALL' || t.currency === currencyFilter;

    let matchesType = true;
    if (typeFilter === 'Pending') {
      matchesType = isStatusPending(t.status);
    } else if (typeFilter === 'Wire') {
      matchesType = (t.type || '').toLowerCase().includes('wire') || (t.transferType || '').toLowerCase().includes('wire');
    } else if (typeFilter === 'Deposit') {
      matchesType = t.type === 'Deposit' || t.type === 'Credit';
    } else if (typeFilter === 'Bill') {
      matchesType = (t.description || '').toLowerCase().includes('bill') || (t.type || '').toLowerCase().includes('bill');
    }

    return matchesQuery && matchesCurrency && matchesType;
  });

  const exportToCSV = () => {
    if (filtered.length === 0) return;

    const headers = ['Date', 'Reference', 'User Email', 'Account Number', 'Amount', 'Currency', 'Type', 'Status', 'Description', 'Processed By SVB Review'];
    const rows = filtered.map(t => [
      `"${new Date(t.createdAt || Date.now()).toLocaleString()}"`,
      `"${t.reference || ''}"`,
      `"${t.userEmail || ''}"`,
      `"${t.accountNumber || ''}"`,
      Number(t.amount) || 0,
      `"${t.currency || 'USD'}"`,
      `"${t.type || ''}"`,
      `"${t.status || ''}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.createdByAdminEmail || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SVB_Transaction_Ledger_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <BackButton />
      </div>
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-[#002b49] text-[#00a3e0] rounded-lg">
              <History className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              SVB Commercial General Ledger
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Account Statements & Audit Records
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin 
              ? 'Complete institutional ledger showing transactions across all customer accounts' 
              : 'Official immutable audit record of settled wires, ACH transfers, and pending requests.'}
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={filtered.length === 0}
          className="bg-[#002b49] hover:bg-[#001f35] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors self-start md:self-auto shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4 text-cyan-300" />
          <span>Export CSV ({filtered.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, recipient, acc #, description..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00a3e0]"
            />
          </div>

          {/* Currency Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-center">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Currency:</span>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-[#00a3e0]"
            >
              <option value="ALL">All Currencies</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="NGN">NGN (₦)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Segmented Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          {(['ALL', 'Wire', 'Deposit', 'Bill', 'Pending'] as const).map((filterVal) => (
            <button
              key={filterVal}
              onClick={() => setTypeFilter(filterVal)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                typeFilter === filterVal
                  ? 'bg-[#002b49] text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {filterVal === 'ALL' ? 'All Transactions' : filterVal === 'Wire' ? 'Wires' : filterVal === 'Deposit' ? 'Deposits' : filterVal === 'Bill' ? 'Bill Payments' : 'Pending Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <History className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">
              {searchQuery || currencyFilter !== 'ALL' || typeFilter !== 'ALL' ? 'No matching transaction records' : 'No transactions recorded yet'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || currencyFilter !== 'ALL' || typeFilter !== 'ALL' 
                ? 'Try adjusting your search terms or clearing the current filters.' 
                : 'Settled deposits and outgoing wire transfers will automatically appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Reference</th>
                  {isAdmin && <th className="py-3 px-4">Target User</th>}
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((txn) => {
                  const isDeposit = txn.type === 'Deposit' || txn.type === 'Credit';
                  return (
                    <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-mono tabular-nums">
                        {new Date(txn.createdAt || Date.now()).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        {txn.reference || txn.id.slice(0, 12)}
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{txn.userEmail}</p>
                          <p className="font-mono text-[10px] text-slate-400">Acc #{txn.accountNumber}</p>
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-slate-800 font-semibold max-w-xs truncate">
                        {txn.description}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {txn.type}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 font-mono font-bold text-sm text-right whitespace-nowrap tabular-nums ${
                        isDeposit ? 'text-emerald-700' : 'text-slate-900'
                      }`}>
                        {isDeposit ? '+' : '-'}${(Number(txn.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {txn.currency || 'USD'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 uppercase ${
                          isStatusApproved(txn.status)
                            ? 'bg-emerald-100 text-emerald-800'
                            : isStatusPending(txn.status)
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isStatusApproved(txn.status) ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : isStatusPending(txn.status) ? (
                            <Clock className="w-3 h-3 text-amber-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>{isStatusApproved(txn.status) ? (txn.status === 'Approved' ? 'Completed' : txn.status) : isStatusPending(txn.status) ? 'Pending Review' : txn.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onOpenReceipt(txn)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[#002b49] rounded-lg transition-colors font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#00a3e0]" />
                          <span>Slip</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
