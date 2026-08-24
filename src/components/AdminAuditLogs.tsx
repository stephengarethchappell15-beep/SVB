import React, { useState } from 'react';
import { AuditLog } from '../types';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  FileText, 
  UserCheck, 
  Sparkles, 
  Lock,
  Clock
} from 'lucide-react';

interface AdminAuditLogsProps {
  logs: AuditLog[];
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      log.adminEmail.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.targetEmail.toLowerCase().includes(q) ||
      log.targetAccountNumber.toLowerCase().includes(q) ||
      log.description.toLowerCase().includes(q)
    );
  });

  const exportAuditCSV = () => {
    if (filtered.length === 0) return;

    const headers = ['Timestamp', 'SVB Review Email', 'Action', 'Target Email', 'Target Acc #', 'Description'];
    const rows = filtered.map(l => [
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.adminEmail}"`,
      `"${l.action}"`,
      `"${l.targetEmail}"`,
      `"${l.targetAccountNumber}"`,
      `"${l.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Security_Audit_Logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              Security Audit Logs
            </h1>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
              AUDIT COMPLIANCE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable system audit trails tracking all SVB Review funding, user searches, and account modifications
          </p>
        </div>

        <button
          onClick={exportAuditCSV}
          disabled={filtered.length === 0}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors self-start md:self-auto"
        >
          <Download className="w-4 h-4 text-amber-400" />
          Export Audit Trail ({filtered.length})
        </button>
      </div>

      {/* Search */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, SVB Review email, target user or acc #..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl p-6">
            <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No audit log entries recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">Timestamp</th>
                  <th className="pb-3 px-3">SVB Review Account</th>
                  <th className="pb-3 px-3">Action Type</th>
                  <th className="pb-3 px-3">Target Account / Email</th>
                  <th className="pb-3 px-3">Description & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-200">
                      {log.adminEmail}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        log.action === 'DEPOSIT_CREATED' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : log.action === 'USER_REGISTERED'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-white">{log.targetEmail}</p>
                      {log.targetAccountNumber !== 'N/A' && (
                        <p className="font-mono text-[10px] text-emerald-400">Acc #{log.targetAccountNumber}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      <p className="font-medium text-slate-200">{log.description}</p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
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
