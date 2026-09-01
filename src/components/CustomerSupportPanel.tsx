import React, { useState, useEffect, useRef } from 'react';
import { User, SupportTicket } from '../types';
import { api } from '../services/api';
import { subscribeSupportTicketsFromFirestore } from '../lib/firebase';
import { dbStore } from '../services/dbStore';
import { Headphones, MessageSquare, Plus, Send, Clock, CheckCircle, AlertCircle, ShieldAlert, User as UserIcon, LifeBuoy, Search, Filter, RefreshCw, Hash, Mail, ArrowRight, ExternalLink } from 'lucide-react';
import { openLiveAgentEmail, openSupportEmail, SUPPORT_EMAIL } from '../utils/supportEmail';

interface CustomerSupportPanelProps {
  user: User;
}

export const CustomerSupportPanel: React.FC<CustomerSupportPanelProps> = ({ user }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Open' | 'In Progress' | 'Resolved' | 'Closed'>('ALL');

  // New Ticket Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'Deposit' | 'Withdrawal' | 'Account' | 'Security' | 'General'>('General');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [message, setMessage] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Chat Reply State
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.getSupportTickets();
      setTickets(res.tickets);
      if (selectedTicket) {
        const updated = res.tickets.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      } else if (res.tickets.length > 0) {
        setSelectedTicket(res.tickets[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    const unsub = subscribeSupportTicketsFromFirestore(
      user.role === 'admin' ? undefined : user.id,
      user.role === 'admin',
      (fsTickets) => {
        if (fsTickets && fsTickets.length > 0) {
          fsTickets.forEach(t => dbStore.addSupportTicket(t));
          const sorted = [...fsTickets].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
          setTickets(sorted);
          setSelectedTicket(prev => {
            if (!prev) return sorted[0];
            const updated = sorted.find(t => t.id === prev.id);
            return updated || prev;
          });
        }
      }
    );

    return () => unsub();
  }, [user.id, user.role]);

  const handleSelectTicket = async (t: SupportTicket) => {
    setSelectedTicket(t);
    if (user.role === 'admin' && t.adminRead === false) {
      await api.markTicketRead(t.id, 'admin');
      setTickets(prev => prev.map(item => item.id === t.id ? { ...item, adminRead: true } : item));
    } else if (user.role !== 'admin' && t.userRead === false) {
      await api.markTicketRead(t.id, 'user');
      setTickets(prev => prev.map(item => item.id === t.id ? { ...item, userRead: true } : item));
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    try {
      setCreateLoading(true);
      const res = await api.createSupportTicket({
        subject: subject.trim(),
        category,
        priority,
        message: message.trim()
      });
      setShowCreateModal(false);
      setSubject('');
      setMessage('');
      await fetchTickets();
      setSelectedTicket(res.ticket);
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      setReplyLoading(true);
      const res = await api.replySupportTicket(selectedTicket.id, replyText.trim());
      setSelectedTicket(res.ticket);
      setReplyText('');
      await fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply.');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: any) => {
    try {
      const res = await api.updateTicketStatus(ticketId, newStatus);
      setSelectedTicket(res.ticket);
      await fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
      (t.accountNumber && t.accountNumber.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.subject && t.subject.toLowerCase().includes(q)) ||
      (t.userName && t.userName.toLowerCase().includes(q)) ||
      (t.messages && t.messages.some(m => m.message.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
              alt="Support Lead"
              className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
            />
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5" title="Online" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {user.role === 'admin' ? 'SVB Support Ticket Management Desk' : '24/7 Client Support Center'}
              </h2>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {user.role === 'admin' ? 'Admin Portal' : 'Online Desk'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {user.role === 'admin' 
                ? 'Search, manage, and reply to client inquiries, verification tickets, and security requests.'
                : 'Assigned Lead: Sarah Mitchell | Official Client Service Desk'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user.role !== 'admin' && (
            <button
              onClick={() => openSupportEmail(user)}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title={`Email support desk directly at ${SUPPORT_EMAIL}`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Email Desk ({SUPPORT_EMAIL})</span>
              <span className="sm:hidden">Email Desk</span>
            </button>
          )}

          <button
            onClick={fetchTickets}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Refresh Inquiries"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Support Ticket</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Ticket List + Message View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Tickets */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col h-[600px]">
          {/* Header & Search */}
          <div className="space-y-3 pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <LifeBuoy className="w-4 h-4 text-emerald-400" />
                <span>Inquiries ({filteredTickets.length})</span>
              </h3>
              {tickets.length > 0 && (
                <span className="text-[10px] text-slate-500 font-mono">
                  Total: {tickets.length}
                </span>
              )}
            </div>

            {/* Search Input for Admin & User */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={user.role === 'admin' ? "Search by email, acc #, ref ID..." : "Search tickets..."}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              />
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
              {(['ALL', 'Open', 'In Progress', 'Resolved', 'Closed'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">No matching support tickets found.</p>
                <p className="text-[11px] text-slate-600">
                  {searchQuery ? 'Try clearing your search query.' : 'Click "New Support Ticket" above to open an inquiry.'}
                </p>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isUnread = user.role === 'admin' ? t.adminRead === false : t.userRead === false;
                return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                    selectedTicket?.id === t.id
                      ? 'bg-slate-800 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                      : isUnread
                      ? 'bg-slate-950/90 border-amber-500/40 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      )}
                      <span className={`text-xs truncate ${isUnread ? 'font-bold text-white' : 'font-semibold text-slate-100'}`}>
                        {t.subject}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isUnread && (
                        <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          NEW
                        </span>
                      )}
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                        t.status === 'Open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        t.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        t.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-slate-700/20 text-slate-400 border-slate-700/30'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>

                  {user.role === 'admin' && (
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <span className="text-slate-300 font-semibold">{t.userName}</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-400">Acc #{t.accountNumber}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-slate-300">
                      {t.category}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              );})
            )}
          </div>
        </div>

        {/* Right Column: Chat Thread */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-[600px]">
          {selectedTicket ? (
            <>
              {/* Ticket Header */}
              <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{selectedTicket.subject}</h3>
                    <span className="text-[10px] font-mono text-slate-500">#{selectedTicket.id}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Client: <span className="text-slate-200 font-semibold">{selectedTicket.userName}</span> | Email: <span className="text-slate-300">{selectedTicket.userEmail}</span> | Acc: <span className="font-mono text-emerald-400">#{selectedTicket.accountNumber}</span>
                  </p>
                </div>

                {user.role === 'admin' ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Status:</label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1 outline-none font-semibold cursor-pointer"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                ) : (
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                    selectedTicket.status === 'Open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    selectedTicket.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    selectedTicket.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-slate-700/20 text-slate-400 border-slate-700/30'
                  }`}>
                    {selectedTicket.status}
                  </span>
                )}
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
                {selectedTicket.messages.map((m) => {
                  const isUser = m.senderRole === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[88%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300">{m.senderName}</span>
                        {!isUser && (
                          <span className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 rounded font-bold border border-amber-500/20">
                            SUPPORT DESK
                          </span>
                        )}
                        <span>• {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className={`p-3.5 rounded-2xl text-xs text-slate-100 whitespace-pre-wrap ${
                        isUser 
                          ? 'bg-emerald-600/30 border border-emerald-500/30 rounded-tr-none' 
                          : 'bg-slate-950 border border-slate-800 rounded-tl-none'
                      }`}>
                        <p className="whitespace-pre-wrap">{m.message}</p>
                        {!isUser && m.message.toLowerCase().includes('contact a live agent') && user.role !== 'admin' && (
                          <div className="pt-2.5">
                            <button
                              type="button"
                              onClick={() => openLiveAgentEmail(user, { amount: 2500, method: 'Payment Proof Verification' })}
                              className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Contact Live Agent</span>
                              <ExternalLink className="w-3 h-3 opacity-70" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Box */}
              <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply message..."
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={replyLoading || !replyText.trim()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {replyLoading ? 'Sending...' : (
                    <>
                      <span>Reply</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <Headphones className="w-10 h-10 text-slate-600" />
              <p className="text-xs">Select a support ticket from the list to view conversation.</p>
            </div>
          )}
        </div>

      </div>

      {/* New Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Create New Support Inquiry</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official Support Desk: <span className="text-emerald-400 font-mono">{SUPPORT_EMAIL}</span>
              </p>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your inquiry"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="Deposit">Deposit</option>
                    <option value="Withdrawal">Withdrawal</option>
                    <option value="Account">Account</option>
                    <option value="Security">Security</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explain your inquiry in detail..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {createLoading ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
