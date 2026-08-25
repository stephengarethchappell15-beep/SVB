import React, { useState, useEffect, useRef } from 'react';
import { User, SupportTicket, SupportMessage } from '../types';
import { api } from '../services/api';
import { 
  subscribeSupportTicketsFromFirestore, 
  subscribeTicketMessagesFromFirestore, 
  getTicketMessagesFromFirestore, 
  getAllUsersFromFirestore,
  subscribeAllUsersFromFirestore,
  normalizeSupportMessage,
  mergeSupportTickets,
  isSameTicketId,
  getCanonicalTicketId
} from '../lib/firebase';
import { dbStore } from '../services/dbStore';
import { subscribeRealtimeUpdates } from '../services/realtimeBus';
import { 
  Headphones, 
  MessageSquare, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ShieldAlert, 
  User as UserIcon, 
  LifeBuoy,
  Search,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Filter,
  Sparkles,
  Paperclip,
  Maximize2,
  Mail,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Trash2
} from 'lucide-react';

interface CustomerSupportPanelProps {
  user: User;
  initialTicketId?: string;
  initialUserId?: string;
  initialUserEmail?: string;
}

export const CustomerSupportPanel: React.FC<CustomerSupportPanelProps> = ({ 
  user, 
  initialTicketId,
  initialUserId,
  initialUserEmail 
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTicketId || null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const selectedTicketIdRef = useRef<string | null>(initialTicketId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState(initialUserEmail || '');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Resolved'>('All');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(initialTicketId || initialUserEmail ? 'chat' : 'list');

  // Keep ref in sync
  useEffect(() => {
    selectedTicketIdRef.current = selectedTicketId;
  }, [selectedTicketId]);

  // New Ticket Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'Deposit' | 'Withdrawal' | 'Account' | 'Security' | 'General'>('General');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [message, setMessage] = useState('');
  const [createImage, setCreateImage] = useState<string>('');
  const [createLoading, setCreateLoading] = useState(false);

  // Chat Reply State
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string>('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (instant = false) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      if (instant) {
        container.scrollTop = container.scrollHeight;
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  useEffect(() => {
    if (selectedTicket) {
      scrollToBottom(true);
    }
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (selectedTicket?.messages && selectedTicket.messages.length > 0) {
      scrollToBottom(false);
    }
  }, [selectedTicket?.messages?.length]);

  const selectBestTicket = (allTickets: SupportTicket[], preferId?: string, preferEmail?: string, preferUid?: string) => {
    if (!allTickets || allTickets.length === 0) return null;
    
    // 1. Direct ticketId match
    if (preferId) {
      const match = allTickets.find(t => isSameTicketId(t.id, preferId) || isSameTicketId(t.chatId, preferId));
      if (match) return match;
    }

    // 2. Direct userEmail match
    if (preferEmail && preferEmail.trim()) {
      const cleanEmail = preferEmail.trim().toLowerCase();
      const match = allTickets.find(t => (t.userEmail && t.userEmail.toLowerCase() === cleanEmail));
      if (match) return match;
    }

    // 3. Direct userId match
    if (preferUid && preferUid.trim()) {
      const match = allTickets.find(t => t.userId === preferUid);
      if (match) return match;
    }

    return allTickets[0];
  };

  const fetchTickets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getSupportTickets();
      const freshTickets = res.tickets || [];
      setTickets(freshTickets);
      
      setSelectedTicket(prev => {
        const targetId = selectedTicketIdRef.current || prev?.id || initialTicketId;
        if (targetId) {
          const updated = freshTickets.find(t => isSameTicketId(t.id, targetId) || isSameTicketId(t.chatId, targetId));
          if (updated) {
            return prev ? mergeSupportTickets(prev, updated) : updated;
          }
        }
        if (prev) {
          return prev;
        }
        return selectBestTicket(freshTickets, initialTicketId, initialUserEmail, initialUserId);
      });
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load support tickets');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (initialUserEmail) {
      setSearchFilter(initialUserEmail);
    }
    if (initialTicketId) {
      setSelectedTicketId(initialTicketId);
      selectedTicketIdRef.current = initialTicketId;
    }
  }, [initialUserEmail, initialTicketId]);

  useEffect(() => {
    // Initial fetch from local store & backend
    fetchTickets(false);

    // Subscribe to registered users from Firestore to ensure all client records (such as deepsingh9003@gmail.com) are instantly available
    const unsubUsers = subscribeAllUsersFromFirestore((liveUsers) => {
      if (liveUsers && liveUsers.length > 0) {
        liveUsers.forEach(u => dbStore.saveUser(u));
        setRegisteredUsers(liveUsers);
      }
    });
    getAllUsersFromFirestore().then(users => {
      if (users && users.length > 0) {
        users.forEach(u => dbStore.saveUser(u));
        setRegisteredUsers(users);
      }
    }).catch(() => {});

    // Real-time Firestore snapshot listener
    const userIdentifier = user.role === 'admin' ? undefined : { id: user.id, email: user.email };
    const unsubFirestore = subscribeSupportTicketsFromFirestore(
      userIdentifier,
      user.role === 'admin',
      (fsTickets) => {
        if (fsTickets && fsTickets.length > 0) {
          fsTickets.forEach(t => dbStore.addSupportTicket(t));
          setTickets(fsTickets);
          setSelectedTicket(prev => {
            const targetId = selectedTicketIdRef.current || prev?.id || initialTicketId;
            if (targetId) {
              const updated = fsTickets.find(t => isSameTicketId(t.id, targetId) || isSameTicketId(t.chatId, targetId));
              if (updated) {
                return prev ? mergeSupportTickets(prev, updated) : updated;
              }
            }
            if (prev) {
              return prev;
            }
            return selectBestTicket(fsTickets, initialTicketId, initialUserEmail, initialUserId);
          });
        }
      }
    );

    // Cross-tab real-time event bus listener
    const unsubRealtimeBus = subscribeRealtimeUpdates((event) => {
      if (event.type.includes('SUPPORT') || event.type.includes('TICKET')) {
        const localTickets = dbStore.getSupportTickets(userIdentifier, user.role === 'admin');
        if (localTickets && localTickets.length > 0) {
          setTickets(localTickets);
          setSelectedTicket(prev => {
            const targetId = selectedTicketIdRef.current || prev?.id || initialTicketId;
            if (targetId) {
              const updated = localTickets.find(t => isSameTicketId(t.id, targetId) || isSameTicketId(t.chatId, targetId));
              if (updated) {
                return prev ? mergeSupportTickets(prev, updated) : updated;
              }
            }
            return prev;
          });
        }
      }
    });

    return () => {
      unsubUsers();
      unsubFirestore();
      unsubRealtimeBus();
    };
  }, [user.id, user.email, user.role, initialTicketId, initialUserEmail, initialUserId]);

  // Live real-time subcollection and query listener for the currently selected active ticket
  useEffect(() => {
    if (!selectedTicket || !selectedTicket.id) return;

    const currentTicketId = selectedTicket.id;

    // Proactive hydration of full messages from Firestore subcollections and parent docs
    getTicketMessagesFromFirestore(currentTicketId).then((fetchedMsgs) => {
      if (fetchedMsgs && fetchedMsgs.length > 0) {
        setSelectedTicket(prev => {
          if (!prev || !isSameTicketId(prev.id, currentTicketId)) return prev;
          return mergeSupportTickets(prev, { ...prev, messages: fetchedMsgs });
        });
      }
    }).catch((e) => console.warn('Instant ticket messages hydration warning:', e));

    const unsubTicketMessages = subscribeTicketMessagesFromFirestore(currentTicketId, (liveMsgs) => {
      if (liveMsgs && liveMsgs.length > 0) {
        setSelectedTicket(prev => {
          if (!prev || !isSameTicketId(prev.id, currentTicketId)) return prev;
          return mergeSupportTickets(prev, { ...prev, messages: liveMsgs });
        });

        // Also update in tickets list state
        setTickets(prevList => prevList.map(t => {
          if (isSameTicketId(t.id, currentTicketId)) {
            return mergeSupportTickets(t, { ...t, messages: liveMsgs });
          }
          return t;
        }));
      }
    });

    return () => {
      unsubTicketMessages();
    };
  }, [selectedTicket?.id]);

  const handleSelectTicket = (t: SupportTicket) => {
    setSelectedTicketId(t.id);
    selectedTicketIdRef.current = t.id;
    setSelectedTicket(prev => (prev && isSameTicketId(prev.id, t.id) ? mergeSupportTickets(prev, t) : t));
    setMobileView('chat');
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>, isReply: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      if (isReply) {
        setReplyImage(b64);
      } else {
        setCreateImage(b64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || (!message.trim() && !createImage)) return;

    try {
      setCreateLoading(true);

      if (user.role === 'admin' && targetUserEmail.trim()) {
        const res = await api.createSupportTicketForUser(
          targetUserEmail.trim(),
          subject.trim(),
          message.trim() || 'Attached image file',
          createImage ? [createImage] : undefined
        );
        setShowCreateModal(false);
        setTargetUserEmail('');
        setSubject('');
        setMessage('');
        setCreateImage('');
        setSelectedTicketId(res.ticket.id);
        selectedTicketIdRef.current = res.ticket.id;
        setSelectedTicket(res.ticket);
        setTickets(prev => [res.ticket, ...prev.filter(t => !isSameTicketId(t.id, res.ticket.id))]);
      } else {
        const res = await api.createSupportTicket({
          subject: subject.trim(),
          category,
          priority,
          message: message.trim() || 'Attached image file',
          images: createImage ? [createImage] : undefined
        });
        setShowCreateModal(false);
        setSubject('');
        setMessage('');
        setCreateImage('');
        setSelectedTicketId(res.ticket.id);
        selectedTicketIdRef.current = res.ticket.id;
        setSelectedTicket(res.ticket);
        setTickets(prev => [res.ticket, ...prev.filter(t => !isSameTicketId(t.id, res.ticket.id))]);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || (!replyText.trim() && !replyImage)) return;

    const replyMsg = replyText.trim() || 'Attached image';
    const replyImg = replyImage ? [replyImage] : undefined;
    const nowIso = new Date().toISOString();

    setReplyText('');
    setReplyImage('');

    // Optimistic UI response
    const optimisticMsg: SupportMessage = {
      id: `msg-opt-${Date.now()}`,
      ticketId: selectedTicket.id,
      chatId: selectedTicket.id,
      threadId: selectedTicket.id,
      roomId: selectedTicket.id,
      senderId: user.id,
      senderName: user.role === 'admin' ? 'SVB Client Support' : user.fullName,
      senderRole: user.role === 'admin' ? 'admin' : 'user',
      message: replyMsg,
      images: replyImg,
      createdAt: nowIso
    };

    const targetTicketId = selectedTicket.id;
    setSelectedTicket(prev => prev ? {
      ...prev,
      messages: [...(prev.messages || []), optimisticMsg]
    } : prev);
    scrollToBottom(false);

    try {
      setReplyLoading(true);
      const res = await api.replySupportTicket(
        targetTicketId, 
        replyMsg, 
        replyImg
      );
      setSelectedTicket(prev => prev ? mergeSupportTickets(prev, res.ticket) : res.ticket);
      setTickets(prev => prev.map(t => isSameTicketId(t.id, res.ticket.id) ? mergeSupportTickets(t, res.ticket) : t));
      scrollToBottom(false);
    } catch (err: any) {
      alert(err.message || 'Failed to send reply.');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: any) => {
    try {
      const res = await api.updateTicketStatus(ticketId, newStatus);
      setSelectedTicket(prev => prev ? mergeSupportTickets(prev, res.ticket) : res.ticket);
      setTickets(prev => prev.map(t => isSameTicketId(t.id, res.ticket.id) ? mergeSupportTickets(t, res.ticket) : t));
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteMessage = async (msgId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (user.role !== 'admin') {
      alert('Only administrators have permission to delete chat records.');
      return;
    }
    if (!selectedTicket || !msgId) return;

    if (!window.confirm('Are you sure you want to permanently delete this message from the chat thread and Firebase?')) {
      return;
    }

    setDeletingMsgId(msgId);

    // Optimistically remove from state
    const remaining = (selectedTicket.messages || []).filter(m => 
      m && m.id !== msgId && `${m.senderId}-${m.message}-${m.createdAt}` !== msgId
    );

    setSelectedTicket(prev => prev ? {
      ...prev,
      messages: remaining,
      updatedAt: new Date().toISOString()
    } : prev);

    setTickets(prev => prev.map(t => {
      if (isSameTicketId(t.id, selectedTicket.id)) {
        return {
          ...t,
          messages: remaining,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));

    try {
      await api.deleteSupportMessage(selectedTicket.id, msgId);
    } catch (err: any) {
      console.error('Delete message error:', err);
      alert(err.message || 'Failed to delete message from Firebase.');
    } finally {
      setDeletingMsgId(null);
    }
  };

  const handleClearTestMessages = async () => {
    if (user.role !== 'admin') {
      alert('Only administrators have permission to clear chat records.');
      return;
    }
    if (!selectedTicket) return;
    const testMsgs = (selectedTicket.messages || []).filter(m => {
      const txt = extractMessageText(m).toLowerCase();
      return txt.includes('$175') || txt.includes('deposit') || txt.includes('test message') || txt.includes('test');
    });

    if (testMsgs.length === 0) {
      alert('No test messages found in this thread.');
      return;
    }

    if (!window.confirm(`Permanently delete ${testMsgs.length} test message(s) (including $175 deposit messages) from Firebase?`)) {
      return;
    }

    for (const m of testMsgs) {
      const id = m.id || `${m.senderId}-${m.message}-${m.createdAt}`;
      try {
        await api.deleteSupportMessage(selectedTicket.id, id);
      } catch (e) {
        console.warn('Error deleting test message:', e);
      }
    }

    await fetchTickets(true);
  };

  const getUserDetails = (t: SupportTicket) => {
    const allUsers = registeredUsers.length > 0 ? registeredUsers : dbStore.getUsers();
    const cleanUid = (t.userId || '').trim().toLowerCase();
    const cleanEmail = (t.userEmail || '').trim().toLowerCase();
    const cleanAcc = (t.accountNumber || '').trim();
    const cleanName = (t.userName || '').trim().toLowerCase();

    const matchedUser = allUsers.find(u => 
      (cleanUid && u.id && u.id.toLowerCase() === cleanUid) || 
      (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) ||
      (cleanAcc && u.accountNumber === cleanAcc) ||
      (cleanName && u.fullName && u.fullName.toLowerCase() === cleanName)
    );

    return {
      userName: matchedUser?.fullName || t.userName || (t.userEmail ? t.userEmail.split('@')[0] : 'Client'),
      userEmail: matchedUser?.email || t.userEmail || '',
      accountNumber: matchedUser?.accountNumber || t.accountNumber || ''
    };
  };

  // Safe helper to extract text string from any message format
  const extractMessageText = (m: SupportMessage | any): string => {
    if (!m) return '';
    if (typeof m === 'string') return m;
    const text = m.message !== undefined && m.message !== null ? m.message :
      m.text !== undefined && m.text !== null ? m.text :
      m.content !== undefined && m.content !== null ? m.content :
      m.body !== undefined && m.body !== null ? m.body :
      m.msg !== undefined && m.msg !== null ? m.msg :
      m.messageText !== undefined && m.messageText !== null ? m.messageText :
      m.description !== undefined && m.description !== null ? m.description : '';
    return typeof text === 'string' ? text : JSON.stringify(text);
  };

  // Find registered users matching the email/name search query
  const matchingRegisteredUsers = React.useMemo(() => {
    if (user.role !== 'admin' || !searchFilter.trim()) return [];
    const query = searchFilter.toLowerCase().trim();
    const allUsers = registeredUsers.length > 0 ? registeredUsers : dbStore.getUsers();
    return allUsers.filter(u => 
      (u.email && u.email.toLowerCase().includes(query)) || 
      (u.fullName && u.fullName.toLowerCase().includes(query)) ||
      (u.accountNumber && u.accountNumber.includes(query))
    );
  }, [user.role, searchFilter, registeredUsers]);

  const filteredTickets = tickets.filter(t => {
    const details = getUserDetails(t);
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const query = searchFilter.toLowerCase().trim();
    const matchesSearch = !query || 
      t.subject.toLowerCase().includes(query) || 
      details.userName.toLowerCase().includes(query) || 
      details.userEmail.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query) ||
      (details.accountNumber && details.accountNumber.toLowerCase().includes(query)) ||
      (t.messages && t.messages.some(m => extractMessageText(m).toLowerCase().includes(query)));
    return matchesStatus && matchesSearch;
  });

  const handleStartMessageWithUser = async (targetUser: User) => {
    // Check if user already has an existing ticket
    const existingTicket = tickets.find(t => {
      const details = getUserDetails(t);
      return details.userEmail.toLowerCase() === targetUser.email.toLowerCase() || t.userId === targetUser.id;
    });

    if (existingTicket) {
      handleSelectTicket(existingTicket);
      setSearchFilter(targetUser.email);
    } else {
      // Prompt admin to start a new support conversation or open modal
      setTargetUserEmail(targetUser.email);
      setSubject(`Support Inquiry for ${targetUser.fullName}`);
      setShowCreateModal(true);
    }
  };

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
                {user.role === 'admin' ? 'Global Customer Support Desk' : '24/7 Client Support Center'}
              </h2>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {user.role === 'admin' 
                ? 'Review registered client inquiries, search by user email, and send real-time support responses.' 
                : 'Assigned Lead: Sarah Mitchell | Official Client Service Desk'}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setTargetUserEmail('');
            setSubject('');
            setMessage('');
            setShowCreateModal(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{user.role === 'admin' ? 'Direct Message / New Ticket' : 'New Support Ticket'}</span>
        </button>
      </div>

      {/* Admin Email Search & Registered User Match Quick Bar */}
      {user.role === 'admin' && matchingRegisteredUsers.length > 0 && searchFilter.trim() && (
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <UserCheck className="w-4 h-4" />
              Registered User Directory Match ({matchingRegisteredUsers.length})
            </span>
            <span className="text-[11px] text-slate-400">Search: "{searchFilter}"</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchingRegisteredUsers.map(regUser => {
              const userTicket = tickets.find(t => {
                const det = getUserDetails(t);
                return det.userEmail.toLowerCase() === regUser.email.toLowerCase() || t.userId === regUser.id;
              });

              return (
                <div 
                  key={regUser.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-xs truncate">{regUser.fullName}</div>
                    <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{regUser.email}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Acc #{regUser.accountNumber}</div>
                  </div>

                  <button
                    onClick={() => handleStartMessageWithUser(regUser)}
                    className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                  >
                    <span>{userTicket ? 'Open Chat' : 'Message'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Switcher Segmented Control */}
      <div className="lg:hidden flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setMobileView('list')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileView === 'list' 
              ? 'bg-slate-800 text-emerald-400 shadow-sm' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LifeBuoy className="w-3.5 h-3.5" />
          <span>Inquiries ({filteredTickets.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('chat')}
          disabled={!selectedTicket}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 ${
            mobileView === 'chat' 
              ? 'bg-slate-800 text-emerald-400 shadow-sm' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{selectedTicket ? `Chat: ${getUserDetails(selectedTicket).userName.split(' ')[0]}` : 'Active Chat'}</span>
        </button>
      </div>

      {/* Main Grid: Ticket List + Message View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Tickets & Filter */}
        <div className={`lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col h-[650px] ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="px-2 pb-3 border-b border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <LifeBuoy className="w-4 h-4 text-emerald-400" />
                <span>{user.role === 'admin' ? 'Client Inquiries' : 'Your Inquiries'} ({filteredTickets.length})</span>
              </h3>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                Total: {tickets.length}
              </span>
            </div>

            {/* Search Input for User Email & Subject */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search user email, client name, subject, or account #..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] pt-1">
              {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                    statusFilter === st 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold' 
                      : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
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
                <p className="text-xs font-semibold text-slate-400">No support tickets found matching query.</p>
                {user.role === 'admin' ? (
                  <p className="text-[11px] text-slate-500">
                    Search by registered user email or click "Direct Message / New Ticket" to message a client.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-600">Click "New Support Ticket" above to open an inquiry.</p>
                )}
              </div>
            ) : (
              filteredTickets.map((t) => {
                const userDet = getUserDetails(t);
                const isSelected = isSameTicketId(selectedTicket?.id, t.id) || isSameTicketId(selectedTicketId || undefined, t.id);
                const messageCount = (t.messages || []).length;
                const lastMsg = messageCount > 0 ? t.messages[messageCount - 1] : null;
                const lastMsgText = lastMsg ? extractMessageText(lastMsg) : '';

                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/20'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-100 truncate">{t.subject}</span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                        t.status === 'Open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        t.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    {/* Registered Email & User Details Badge */}
                    <div className="mt-1.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-white font-medium">
                        <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{userDet.userName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 w-fit max-w-full truncate">
                        <Mail className="w-3 h-3 shrink-0 text-emerald-400" />
                        <span className="truncate">{userDet.userEmail || 'No Email Recorded'}</span>
                      </div>
                    </div>

                    {/* Message Preview Snippet */}
                    {lastMsgText && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-1.5 italic">
                        "{lastMsgText}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/60">
                      <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                        {userDet.accountNumber ? `Acc #${userDet.accountNumber}` : t.category}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(t.updatedAt || t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Chat Thread */}
        <div className={`lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-[650px] ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
          {selectedTicket ? (
            <>
              {/* Mobile Back Button Header */}
              <div className="lg:hidden flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Inquiries ({filteredTickets.length})</span>
                </button>
                <span className="text-[11px] font-mono text-slate-400">
                  #{selectedTicket.id.slice(-8)}
                </span>
              </div>

              {/* Ticket Header with User Registered Email & Details */}
              <div className="pb-4 border-b border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{selectedTicket.subject}</h3>
                      <span className="text-[10px] font-mono text-slate-500">#{selectedTicket.id}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-xs text-white font-semibold flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        {getUserDetails(selectedTicket).userName}
                      </span>

                      {/* Prominent Registered Email Badge */}
                      <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono px-2 py-0.5 rounded-lg">
                        <Mail className="w-3 h-3 text-emerald-400" />
                        <span>Registered Email: {getUserDetails(selectedTicket).userEmail || 'N/A'}</span>
                      </span>

                      {getUserDetails(selectedTicket).accountNumber && (
                        <span className="bg-slate-950 text-slate-300 border border-slate-800 text-[11px] font-mono px-2 py-0.5 rounded-lg">
                          Acc: {getUserDetails(selectedTicket).accountNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {user.role === 'admin' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearTestMessages}
                        className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Quickly clear test messages ($175 deposit, etc.) from Firebase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Clear Test Messages</span>
                      </button>

                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 outline-none font-semibold cursor-pointer shrink-0 hover:border-emerald-500 transition-colors"
                      >
                        <option value="Open">Status: Open</option>
                        <option value="In Progress">Status: In Progress</option>
                        <option value="Resolved">Status: Resolved</option>
                        <option value="Closed">Status: Closed</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1 scroll-smooth"
              >
                {!selectedTicket.messages || selectedTicket.messages.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Support Conversation Active</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                        Ticket opened for client inquiry: <span className="text-emerald-400 font-semibold">{selectedTicket.subject}</span>.
                        Type your message or attach an image below to communicate directly.
                      </p>
                    </div>
                  </div>
                ) : (
                  selectedTicket.messages.map((m, mIdx) => {
                    const isUser = m.senderRole === 'user';
                    const msgText = extractMessageText(m);
                    const messageIdentifier = m.id || `${m.senderId}-${m.message}-${m.createdAt}`;
                    const isDeleting = deletingMsgId === messageIdentifier;

                    return (
                      <div
                        key={messageIdentifier || `msg-${mIdx}`}
                        className={`group relative flex flex-col max-w-[85%] ${isUser ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-300">
                            {m.senderName || (isUser ? 'Client' : 'Support Desk')}
                          </span>
                          {!isUser && (
                            <span className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 rounded font-bold border border-amber-500/20">
                              SUPPORT DESK
                            </span>
                          )}
                          <span>• {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                          {/* Delete Message Button (Admin Only) */}
                          {user.role === 'admin' && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteMessage(messageIdentifier, e)}
                              disabled={isDeleting}
                              className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-1 rounded-md transition-all ml-1 cursor-pointer flex items-center gap-0.5 opacity-60 group-hover:opacity-100"
                              title="Permanently delete message from Firebase"
                            >
                              <Trash2 className={`w-3 h-3 ${isDeleting ? 'animate-spin text-rose-400' : ''}`} />
                              <span className="text-[9px] hidden sm:inline">{isDeleting ? 'Deleting...' : 'Delete'}</span>
                            </button>
                          )}
                        </div>

                        <div className={`p-3.5 rounded-2xl text-xs space-y-2 ${
                          isUser 
                            ? 'bg-slate-950 border border-slate-800 rounded-tl-none text-slate-100' 
                            : 'bg-emerald-600/30 border border-emerald-500/30 rounded-tr-none text-slate-100'
                        }`}>
                          {msgText && (
                            <p className="whitespace-pre-wrap leading-relaxed break-words font-medium">{msgText}</p>
                          )}

                          {/* Render attached images */}
                          {m.images && m.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {m.images.map((img, idx) => (
                                <div key={idx} className="relative group">
                                  <img
                                    src={img}
                                    alt="Attachment"
                                    onLoad={() => scrollToBottom(false)}
                                    onClick={() => setSelectedImageModal(img)}
                                    className="w-28 h-28 object-cover rounded-xl border border-slate-700 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setSelectedImageModal(img)}
                                    className="absolute bottom-1.5 right-1.5 p-1 bg-slate-950/80 rounded-md text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Expand image"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Preview Attachment */}
              {replyImage && (
                <div className="p-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs px-3 rounded-xl mb-2">
                  <div className="flex items-center gap-2">
                    <img src={replyImage} alt="Attachment" className="w-8 h-8 object-cover rounded-lg border border-slate-700" />
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Image attached for response
                    </span>
                  </div>
                  <button
                    onClick={() => setReplyImage('')}
                    className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Reply Input Box */}
              <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-800 flex items-center gap-2">
                <label 
                  className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-xl border border-slate-800 cursor-pointer transition-colors shrink-0" 
                  title="Attach Screenshot / Image"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFile(e, true)}
                    className="hidden"
                  />
                  <ImageIcon className="w-4 h-4" />
                </label>

                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={user.role === 'admin' ? "Type a reply to registered client..." : "Type your message to support..."}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                />

                <button
                  type="submit"
                  disabled={replyLoading || (!replyText.trim() && !replyImage)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{replyLoading ? 'Sending...' : 'Send'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">No Support Ticket Selected</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {user.role === 'admin' 
                    ? 'Select a client conversation from the inquiry list on the left, or search a registered user to message.' 
                    : 'Select an inquiry to view your messages or click "New Support Ticket" to get help.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Image Modal */}
      {selectedImageModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedImageModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-4 right-4 bg-slate-950/80 text-white p-2 rounded-full hover:bg-slate-800 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImageModal}
              alt="Expanded Preview"
              className="max-h-[85vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* New Ticket / Direct Message Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                  <Headphones className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {user.role === 'admin' ? 'Send Direct Message to Registered Client' : 'Create New Support Ticket'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              {user.role === 'admin' && (
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Target Registered User Email *</label>
                  <input
                    type="email"
                    required
                    value={targetUserEmail}
                    onChange={(e) => setTargetUserEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-medium mb-1">Subject / Inquiry Title *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Wire Transfer Verification / Activation Code"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 outline-none"
                  >
                    <option value="Deposit">Deposit & Funding</option>
                    <option value="Withdrawal">Withdrawal / Wire</option>
                    <option value="Security">4-Digit Security Code</option>
                    <option value="Account">Tier 3 VIP Verification</option>
                    <option value="General">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Detailed Message *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explain your inquiry in detail, provide reference numbers or transaction IDs..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3.5 text-white outline-none resize-none"
                />
              </div>

              {/* Attach Image */}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Attach Image / Screenshot (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-xl text-slate-300 flex items-center gap-2 cursor-pointer transition-colors">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Choose File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFile(e, false)}
                      className="hidden"
                    />
                  </label>
                  {createImage && (
                    <div className="flex items-center gap-2">
                      <img src={createImage} alt="Uploaded" className="w-8 h-8 object-cover rounded-lg border border-slate-700" />
                      <span className="text-emerald-400 font-semibold text-[11px]">Image Attached</span>
                      <button
                        type="button"
                        onClick={() => setCreateImage('')}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {createLoading ? 'Sending...' : 'Start Conversation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
