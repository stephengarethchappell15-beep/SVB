import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, SupportTicket, SupportMessage } from '../types';
import { api } from '../services/api';
import { 
  subscribeSupportTicketsFromFirestore, 
  subscribeTicketMessagesFromFirestore, 
  getTicketMessagesFromFirestore, 
  getAllUsersFromFirestore,
  subscribeAllUsersFromFirestore,
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
  User as UserIcon, 
  Search, 
  Image as ImageIcon, 
  X, 
  CheckCheck, 
  Mail, 
  UserCheck, 
  ArrowLeft, 
  Maximize2, 
  Trash2,
  ShieldCheck,
  Zap,
  PhoneCall,
  Sparkles,
  Paperclip,
  CheckCircle2,
  Lock,
  RefreshCw
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
  const isAdmin = user.role === 'admin';
  const userIdentifier = isAdmin ? undefined : { id: user.id, email: user.email };

  const [tickets, setTickets] = useState<SupportTicket[]>(() => dbStore.getSupportTickets(userIdentifier, isAdmin));
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTicketId || null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const selectedTicketIdRef = useRef<string | null>(initialTicketId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState(initialUserEmail || '');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Resolved' | 'Closed'>('All');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(initialTicketId || initialUserEmail || !isAdmin ? 'chat' : 'list');

  // Keep ref in sync
  useEffect(() => {
    selectedTicketIdRef.current = selectedTicketId;
  }, [selectedTicketId]);

  // New Ticket / Conversation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'Deposit' | 'Withdrawal' | 'Account' | 'Security' | 'General'>('General');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('High');
  const [message, setMessage] = useState('');
  const [createImage, setCreateImage] = useState<string>('');
  const [createLoading, setCreateLoading] = useState(false);

  // Chat Reply State
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string>('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'thread' | 'unified'>('thread');

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

  // Helper to extract message text string safely
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

  // Helper to resolve user details safely
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
      accountNumber: matchedUser?.accountNumber || t.accountNumber || '',
      verificationTier: matchedUser?.verificationTier || 'Tier 1'
    };
  };

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
      let freshTickets = res.tickets || [];

      // Privacy Isolation: Non-admin users only receive their own tickets
      if (!isAdmin) {
        freshTickets = freshTickets.filter(t => 
          t.userId === user.id || 
          (t.userEmail && user.email && t.userEmail.toLowerCase() === user.email.toLowerCase())
        );
      }
      
      setTickets(prev => {
        const mergedMap = new Map<string, SupportTicket>();
        const local = dbStore.getSupportTickets(userIdentifier, isAdmin);
        local.forEach(t => mergedMap.set(getCanonicalTicketId(t.id), t));
        prev.forEach(t => {
          const cid = getCanonicalTicketId(t.id);
          const ex = mergedMap.get(cid);
          mergedMap.set(cid, ex ? mergeSupportTickets(ex, t) : t);
        });
        freshTickets.forEach(t => {
          const cid = getCanonicalTicketId(t.id);
          const ex = mergedMap.get(cid);
          mergedMap.set(cid, ex ? mergeSupportTickets(ex, t) : t);
        });
        return Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        );
      });
      
      setSelectedTicket(prev => {
        const targetId = selectedTicketIdRef.current || prev?.id || initialTicketId;
        if (targetId) {
          const updated = freshTickets.find(t => isSameTicketId(t.id, targetId) || isSameTicketId(t.chatId, targetId));
          if (updated) {
            return (prev && isSameTicketId(prev.id, updated.id)) ? mergeSupportTickets(prev, updated) : updated;
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

  // Live admin search on user directory across Firestore
  useEffect(() => {
    if (!isAdmin || !searchFilter.trim()) return;
    const timer = setTimeout(async () => {
      try {
        const res = await api.searchUsers(searchFilter.trim());
        if (res.users && res.users.length > 0) {
          setRegisteredUsers(prev => {
            const map = new Map<string, User>();
            prev.forEach(u => map.set(u.id, u));
            res.users.forEach(u => {
              map.set(u.id, u);
              dbStore.cacheUser(u);
            });
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn('CustomerSupportPanel user search warning:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isAdmin, searchFilter]);

  useEffect(() => {
    fetchTickets(false);

    if (isAdmin) {
      try {
        localStorage.setItem('svb_admin_last_viewed_support', Date.now().toString());
      } catch {}
    }

    // Only admins subscribe to full user directory
    let unsubUsers = () => {};
    if (isAdmin) {
      unsubUsers = subscribeAllUsersFromFirestore((liveUsers) => {
        if (liveUsers && liveUsers.length > 0) {
          liveUsers.forEach(u => dbStore.cacheUser(u));
          setRegisteredUsers(liveUsers);
        }
      });
      getAllUsersFromFirestore().then(users => {
        if (users && users.length > 0) {
          users.forEach(u => dbStore.cacheUser(u));
          setRegisteredUsers(users);
        }
      }).catch(() => {});
    }

    // Real-time Firestore snapshot listener
    const unsubFirestore = subscribeSupportTicketsFromFirestore(
      userIdentifier,
      isAdmin,
      (fsTickets) => {
        if (fsTickets && fsTickets.length > 0) {
          let visibleTickets = fsTickets;
          if (!isAdmin) {
            visibleTickets = fsTickets.filter(t => 
              t.userId === user.id || 
              (t.userEmail && user.email && t.userEmail.toLowerCase() === user.email.toLowerCase())
            );
          }

          visibleTickets.forEach(t => dbStore.addSupportTicket(t));
          setTickets(prev => {
            const mergedMap = new Map<string, SupportTicket>();
            const local = dbStore.getSupportTickets(userIdentifier, isAdmin);
            local.forEach(t => mergedMap.set(getCanonicalTicketId(t.id), t));
            prev.forEach(t => {
              const cid = getCanonicalTicketId(t.id);
              const ex = mergedMap.get(cid);
              mergedMap.set(cid, ex ? mergeSupportTickets(ex, t) : t);
            });
            visibleTickets.forEach(t => {
              const cid = getCanonicalTicketId(t.id);
              const ex = mergedMap.get(cid);
              mergedMap.set(cid, ex ? mergeSupportTickets(ex, t) : t);
            });
            return Array.from(mergedMap.values()).sort(
              (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
            );
          });

          setSelectedTicket(prev => {
            const targetId = selectedTicketIdRef.current || prev?.id || initialTicketId;
            if (targetId) {
              const updated = visibleTickets.find(t => isSameTicketId(t.id, targetId) || isSameTicketId(t.chatId, targetId));
              if (updated) {
                return (prev && isSameTicketId(prev.id, updated.id)) ? mergeSupportTickets(prev, updated) : updated;
              }
            }
            if (prev) {
              return prev;
            }
            return selectBestTicket(visibleTickets, initialTicketId, initialUserEmail, initialUserId);
          });
        }
      }
    );

    // Cross-tab real-time event bus listener
    const unsubRealtimeBus = subscribeRealtimeUpdates((event) => {
      if (event.type.includes('SUPPORT') || event.type.includes('TICKET')) {
        const localTickets = dbStore.getSupportTickets(userIdentifier, isAdmin);
        if (localTickets && localTickets.length > 0) {
          setTickets(prev => {
            const mergedMap = new Map<string, SupportTicket>();
            localTickets.forEach(t => mergedMap.set(getCanonicalTicketId(t.id), t));
            prev.forEach(t => {
              const cid = getCanonicalTicketId(t.id);
              const ex = mergedMap.get(cid);
              mergedMap.set(cid, ex ? mergeSupportTickets(ex, t) : t);
            });
            return Array.from(mergedMap.values()).sort(
              (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
            );
          });
          setSelectedTicket(prev => {
            const targetId = selectedTicketIdRef.current || prev?.id || initialTicketId;
            if (targetId) {
              const updated = localTickets.find(t => isSameTicketId(t.id, targetId) || isSameTicketId(t.chatId, targetId));
              if (updated) {
                return (prev && isSameTicketId(prev.id, updated.id)) ? mergeSupportTickets(prev, updated) : updated;
              }
            }
            return prev;
          });
        }
      }
    });

    const pollInterval = setInterval(() => {
      fetchTickets(true);
    }, 4000);

    return () => {
      unsubUsers();
      unsubFirestore();
      unsubRealtimeBus();
      clearInterval(pollInterval);
    };
  }, [user.id, user.email, user.role, initialTicketId, initialUserEmail, initialUserId]);

  // Live real-time subcollection listener for the active ticket
  useEffect(() => {
    if (!selectedTicket || !selectedTicket.id) return;

    const currentTicketId = selectedTicket.id;

    // Instant hydration
    getTicketMessagesFromFirestore(currentTicketId).then((fetchedMsgs) => {
      if (fetchedMsgs && fetchedMsgs.length > 0) {
        setSelectedTicket(prev => {
          if (!prev || !isSameTicketId(prev.id, currentTicketId)) return prev;
          return mergeSupportTickets(prev, { ...prev, messages: fetchedMsgs });
        });
      }
    }).catch(() => {});

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

      if (isAdmin && targetUserEmail.trim()) {
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
        setMobileView('chat');
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
        setMobileView('chat');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!replyText.trim() && !replyImage)) return;

    const replyMsg = replyText.trim() || 'Attached image';
    const replyImg = replyImage ? [replyImage] : undefined;
    const nowIso = new Date().toISOString();

    setReplyText('');
    setReplyImage('');

    // If client has no selected ticket yet, auto-create a support ticket room
    if (!selectedTicket) {
      try {
        setReplyLoading(true);
        const res = await api.createSupportTicket({
          subject: 'SVB Priority Client Consultation',
          category: 'General',
          priority: 'High',
          message: replyMsg,
          images: replyImg
        });
        setSelectedTicket(res.ticket);
        setSelectedTicketId(res.ticket.id);
        selectedTicketIdRef.current = res.ticket.id;
        setTickets(prev => [res.ticket, ...prev.filter(t => !isSameTicketId(t.id, res.ticket.id))]);
        scrollToBottom(true);
      } catch (err: any) {
        alert(err.message || 'Failed to send message.');
      } finally {
        setReplyLoading(false);
      }
      return;
    }

    // Optimistic UI response
    const optimisticMsg: SupportMessage = {
      id: `msg-opt-${Date.now()}`,
      ticketId: selectedTicket.id,
      chatId: selectedTicket.id,
      threadId: selectedTicket.id,
      roomId: selectedTicket.id,
      senderId: user.id,
      senderName: isAdmin ? 'SVB Client Support' : user.fullName,
      senderRole: isAdmin ? 'admin' : 'user',
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
    if (!isAdmin) {
      alert('Users do not have permissions to delete chat records.');
      return;
    }
    if (!selectedTicket || !msgId) return;

    if (!window.confirm('Permanently delete this message from the support history and Firebase?')) {
      return;
    }

    setDeletingMsgId(msgId);

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
    } finally {
      setDeletingMsgId(null);
    }
  };

  const handleQuickPresetReply = (text: string) => {
    setReplyText(text);
  };

  // Find registered users matching the email/name search query (Admin only)
  const matchingRegisteredUsers = useMemo(() => {
    if (!isAdmin || !searchFilter.trim()) return [];
    const query = searchFilter.toLowerCase().trim();
    const allUsers = registeredUsers.length > 0 ? registeredUsers : dbStore.getUsers();
    return allUsers.filter(u => 
      (u.email && u.email.toLowerCase().includes(query)) || 
      (u.fullName && u.fullName.toLowerCase().includes(query)) ||
      (u.accountNumber && u.accountNumber.includes(query))
    );
  }, [isAdmin, searchFilter, registeredUsers]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
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
    }).sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [tickets, statusFilter, searchFilter, registeredUsers]);

  // Compute all tickets associated with the currently selected client
  const clientAllTickets = useMemo(() => {
    if (!selectedTicket || !isAdmin) return [];
    const det = getUserDetails(selectedTicket);
    const targetEmail = det.userEmail.toLowerCase().trim();
    const targetUid = (selectedTicket.userId || '').trim();
    const targetAcc = det.accountNumber.trim();
    return tickets.filter(t => {
      const d = getUserDetails(t);
      return (targetEmail && d.userEmail.toLowerCase() === targetEmail) ||
        (targetUid && t.userId === targetUid) ||
        (targetAcc && d.accountNumber === targetAcc);
    }).sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }, [tickets, selectedTicket, isAdmin, registeredUsers]);

  // Compute all messages across all tickets for this client in chronological unbroken order
  const clientUnifiedMessages = useMemo(() => {
    if (!isAdmin || clientAllTickets.length <= 1) {
      return (selectedTicket?.messages || []).map(m => ({ ...m, ticketSubject: selectedTicket?.subject }));
    }
    const combined: (SupportMessage & { ticketSubject?: string; ticketStatus?: string })[] = [];
    const seen = new Set<string>();
    
    clientAllTickets.forEach(t => {
      (t.messages || []).forEach(m => {
        const key = m.id || `${m.senderId}-${m.message}-${m.createdAt}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({
            ...m,
            ticketSubject: t.subject,
            ticketStatus: t.status
          });
        }
      });
    });
    return combined.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }, [isAdmin, clientAllTickets, selectedTicket]);

  const handleStartMessageWithUser = (targetUser: User) => {
    const existingTicket = tickets.find(t => {
      const details = getUserDetails(t);
      return details.userEmail.toLowerCase() === targetUser.email.toLowerCase() || t.userId === targetUser.id;
    });

    if (existingTicket) {
      handleSelectTicket(existingTicket);
      setSearchFilter(targetUser.email);
    } else {
      setTargetUserEmail(targetUser.email);
      setSubject(`Support Inquiry for ${targetUser.fullName}`);
      setMessage('Hello, this is SVB Official Customer Support. How can we assist you today?');
      setShowCreateModal(true);
    }
  };

  const [copiedEmail, setCopiedEmail] = useState(false);
  const SUPPORT_EMAIL = 'siliconvalleybank51@gmail.com';

  const handleOpenLiveAgentEmail = () => {
    const subject = encodeURIComponent(`Live Agent Support Inquiry - ${user.fullName} (Acc #${user.accountNumber})`);
    const body = encodeURIComponent(`Hello Silicon Valley Bank Support Team,\n\nI require assistance with my account.\n\nAccount Holder: ${user.fullName}\nEmail: ${user.email}\nAccount Number: ${user.accountNumber}\n\nInquiry Details:\n`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const handleCopyEmail = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const renderMessageContent = (m: any, text: string) => {
    const isBotOfflineMessage = 
      m?.senderId === 'svb-live-agent-bot' || 
      (m?.senderRole !== 'user' && text.includes('Kindly hold on, our support is currently unavailable'));

    if (isBotOfflineMessage) {
      const parts = text.split(SUPPORT_EMAIL);
      return (
        <div className="space-y-2.5">
          <p className="whitespace-pre-wrap leading-relaxed break-words font-medium">
            {parts[0]}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Live%20Agent%20Support%20Inquiry%20-%20${encodeURIComponent(user.fullName)}`}
              className="text-amber-400 hover:text-amber-300 font-bold underline decoration-amber-400/50 inline-flex items-center gap-1 mx-1 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 inline" />
              {SUPPORT_EMAIL}
            </a>
            {parts.slice(1).join(SUPPORT_EMAIL)}
          </p>

          <div className="pt-1.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenLiveAgentEmail}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-[11px] shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Message Live Agent (Email)</span>
            </button>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-[11px] border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              title="Copy email address"
            >
              {copiedEmail ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Mail className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
            </button>
          </div>
        </div>
      );
    }

    // Clean standard text bubble for all admin replies & user messages
    if (text.includes(SUPPORT_EMAIL)) {
      const parts = text.split(SUPPORT_EMAIL);
      return (
        <p className="whitespace-pre-wrap leading-relaxed break-words font-medium">
          {parts[0]}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-emerald-400 hover:underline font-medium"
          >
            {SUPPORT_EMAIL}
          </a>
          {parts.slice(1).join(SUPPORT_EMAIL)}
        </p>
      );
    }

    return <p className="whitespace-pre-wrap leading-relaxed break-words font-medium">{text}</p>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/10">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
                <Headphones className="w-6 h-6" />
              </div>
            </div>
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5 animate-pulse" title="24/7 Live Sync" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {isAdmin ? 'WhatsApp-Style Support Desk' : 'Silicon Valley Bank Client Support'}
              </h2>
              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                End-to-End Private
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdmin 
                ? 'Real-time two-way messaging, search registered emails/accounts, and permanent Firestore history.' 
                : 'Choose between direct Live Agent email support or SVB Live in-app messaging.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => fetchTickets(false)}
            className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition-all cursor-pointer"
            title="Refresh Live Inquiries"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

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
            <span>{isAdmin ? 'Direct Message / New Ticket' : 'Open Inquiry'}</span>
          </button>
        </div>
      </div>

      {/* Dual Support Choice Banner for Non-Admin Clients */}
      {!isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OPTION 1: LIVE AGENT (Direct Email Client) */}
          <div 
            onClick={handleOpenLiveAgentEmail}
            className="group bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 hover:border-amber-400 rounded-3xl p-4 shadow-lg cursor-pointer transition-all hover:shadow-amber-500/10 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Live Agent Support</h3>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
                      Priority Email
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Directly message support from your email inbox</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-mono text-amber-300">
                <Mail className="w-3.5 h-3.5" />
                <span>{SUPPORT_EMAIL}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] border border-slate-700 flex items-center gap-1 transition-colors"
                >
                  {copiedEmail ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Mail className="w-3 h-3" />}
                  <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                </button>
                <span className="text-amber-400 font-bold group-hover:translate-x-1 transition-transform">Open &rarr;</span>
              </div>
            </div>
          </div>

          {/* OPTION 2: SVB LIVE (In-App Messaging) */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl p-4 shadow-lg flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">SVB Live Chat</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-xs text-slate-400">In-app interactive live support workspace</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Syncing live with SVB Concierge Desk</span>
              <span className="text-emerald-400 font-bold">Active Below</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Email Search & Registered User Match Quick Bar */}
      {isAdmin && matchingRegisteredUsers.length > 0 && searchFilter.trim() && (
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
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Acc: {regUser.accountNumber} • Balance: ${regUser.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartMessageWithUser(regUser)}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{userTicket ? 'View Chat' : 'Start WhatsApp Chat'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Left Column Inquiries List + Right Column WhatsApp Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Inquiry Queue & Search (Hidden on mobile when chat is active) */}
        <div className={`lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col h-[680px] ${mobileView === 'chat' && isAdmin ? 'hidden lg:flex' : !isAdmin && tickets.length <= 1 ? 'hidden lg:flex' : 'flex'}`}>
          <div className="space-y-3 pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>{isAdmin ? `Client Inquiries (${filteredTickets.length})` : `Your Inquiries (${filteredTickets.length})`}</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Live Cloud Sync
              </span>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={isAdmin ? "Search registered email, account #, name..." : "Search messages..."}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Tabs (Admin Only) */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {(['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      statusFilter === st 
                        ? 'bg-emerald-500 text-slate-950 font-bold' 
                        : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
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
                {isAdmin ? (
                  <p className="text-[11px] text-slate-500">
                    Search by registered user email or click "Direct Message / New Ticket" to message a client.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-600">Click "Open Inquiry" above to send a message to support.</p>
                )}
              </div>
            ) : (
              filteredTickets.map((t) => {
                const userDet = getUserDetails(t);
                const isSelected = isSameTicketId(selectedTicket?.id, t.id) || isSameTicketId(selectedTicketId || undefined, t.id);
                const messageCount = (t.messages || []).length;
                const lastMsg = messageCount > 0 ? t.messages[messageCount - 1] : null;
                const lastMsgText = lastMsg ? extractMessageText(lastMsg) : '';
                const lastSenderIsUser = lastMsg ? lastMsg.senderRole === 'user' : false;

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

                    {/* Message Preview Snippet with sender role */}
                    {lastMsgText && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 line-clamp-1 mt-1.5">
                        <span className="font-semibold text-slate-300">{lastSenderIsUser ? 'Client:' : 'Support:'}</span>
                        <span className="truncate italic">"{lastMsgText}"</span>
                      </div>
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

        {/* Right Column: WhatsApp Live Chat Canvas */}
        <div className={`${!isAdmin && tickets.length <= 1 ? 'lg:col-span-12' : 'lg:col-span-7'} bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-[680px] ${mobileView === 'list' && isAdmin ? 'hidden lg:flex' : 'flex'}`}>
          {selectedTicket ? (
            <>
              {/* Mobile Back Button Header */}
              {isAdmin && (
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
              )}

              {/* Ticket Header with User Registered Email & Details */}
              <div className="pb-4 border-b border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shrink-0">
                      <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400 font-bold text-sm">
                        {getUserDetails(selectedTicket).userName.slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">{selectedTicket.subject}</h3>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">#{selectedTicket.id.slice(-8)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-white font-semibold flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          {getUserDetails(selectedTicket).userName}
                        </span>

                        {/* Prominent Registered Email Badge */}
                        <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono px-2 py-0.5 rounded-lg">
                          <Mail className="w-3 h-3 text-emerald-400" />
                          <span>{getUserDetails(selectedTicket).userEmail || 'Client Account'}</span>
                        </span>

                        {getUserDetails(selectedTicket).accountNumber && (
                          <span className="bg-slate-950 text-slate-300 border border-slate-800 text-[11px] font-mono px-2 py-0.5 rounded-lg">
                            Acc: {getUserDetails(selectedTicket).accountNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
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

                {/* Admin Multi-Ticket Unified History View Switcher */}
                {isAdmin && clientAllTickets.length > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Found <strong className="text-white">{clientAllTickets.length} past tickets</strong> for this client</span>
                    </span>
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setViewMode('thread')}
                        className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                          viewMode === 'thread'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Active Thread ({selectedTicket.messages?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('unified')}
                        className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                          viewMode === 'unified'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Display unbroken chronological conversation history across all tickets for this user"
                      >
                        Unbroken History ({clientUnifiedMessages.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages Scroll Area */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1 scroll-smooth bg-slate-950/30 rounded-2xl p-3 border border-slate-800/40 my-2"
              >
                {(() => {
                  const messagesToRender = (viewMode === 'unified' && isAdmin && clientAllTickets.length > 1) 
                    ? clientUnifiedMessages 
                    : (selectedTicket.messages || []);

                  if (!messagesToRender || messagesToRender.length === 0) {
                    return (
                      <div className="text-center py-10 px-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
                          <Headphones className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Private WhatsApp-Style Chat Active</p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                            Ticket thread initialized for: <span className="text-emerald-400 font-semibold">{selectedTicket.subject}</span>.
                            All messages sync immediately to both the client device and SVB admin desk.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return messagesToRender.map((m: any, mIdx: number) => {
                    const isSenderUser = m.senderRole === 'user';
                    // Bubble alignment:
                    // If Admin viewing: Admin replies are on Right (isSenderUser = false -> ml-auto), Client msgs on Left (isSenderUser = true -> mr-auto).
                    // If Client viewing: Client msgs are on Right (isSenderUser = true -> ml-auto), Support msgs on Left (isSenderUser = false -> mr-auto).
                    const isRightBubble = isAdmin ? !isSenderUser : isSenderUser;
                    const msgText = extractMessageText(m);
                    const messageIdentifier = m.id || `${m.senderId}-${m.message}-${m.createdAt}`;
                    const isDeleting = deletingMsgId === messageIdentifier;

                    return (
                      <div
                        key={messageIdentifier || `msg-${mIdx}`}
                        className={`group relative flex flex-col max-w-[85%] ${isRightBubble ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-300">
                            {isSenderUser ? (m.senderName || 'Client') : (m.senderName || 'SVB Client Support')}
                          </span>
                          {!isSenderUser && (
                            <span className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 rounded font-bold border border-amber-500/20">
                              SUPPORT DESK
                            </span>
                          )}
                          {m.ticketSubject && viewMode === 'unified' && (
                            <span className="bg-slate-800 text-slate-300 text-[9px] px-1.5 rounded border border-slate-700 font-mono truncate max-w-[120px]" title={m.ticketSubject}>
                              {m.ticketSubject}
                            </span>
                          )}
                          <span>• {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                          {/* Admin Only Delete capability */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteMessage(messageIdentifier, e)}
                              disabled={isDeleting}
                              className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1 rounded-md transition-all ml-1 cursor-pointer flex items-center gap-0.5 opacity-0 group-hover:opacity-100"
                              title="Delete message from history"
                            >
                              <Trash2 className={`w-3 h-3 ${isDeleting ? 'animate-spin text-rose-400' : ''}`} />
                            </button>
                          )}
                        </div>

                        <div className={`p-3.5 rounded-2xl text-xs space-y-2 shadow-md ${
                          isRightBubble 
                            ? 'bg-emerald-600/30 border border-emerald-500/40 rounded-tr-none text-slate-100' 
                            : 'bg-slate-950 border border-slate-800 rounded-tl-none text-slate-100'
                        }`}>
                          {msgText && renderMessageContent(m, msgText)}

                          {/* Render attached images */}
                          {m.images && m.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1.5">
                              {m.images.map((img: string, idx: number) => (
                                <div key={idx} className="relative group/img">
                                  <img
                                    src={img}
                                    alt="Attachment"
                                    onLoad={() => scrollToBottom(false)}
                                    onClick={() => setSelectedImageModal(img)}
                                    className="w-32 h-32 object-cover rounded-xl border border-slate-700 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setSelectedImageModal(img)}
                                    className="absolute bottom-1.5 right-1.5 p-1 bg-slate-950/80 rounded-md text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                                    title="Expand image"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* WhatsApp Style Double Check mark */}
                          <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 pt-0.5">
                            <span>{new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <CheckCheck className="w-3 h-3 text-emerald-400" />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Preset Response Chips for Admin */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 text-[10px]">
                  <span className="text-slate-500 font-semibold flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Quick Replies:
                  </span>
                  {[
                    "Deposit Approved & Credited to Balance",
                    "Wire Transfer Completed Successfully",
                    "4-Digit Security Code Verified & Approved",
                    "Please upload screenshot of verification",
                    "Your account status is Active and cleared"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickPresetReply(preset)}
                      className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-500/40 px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}

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
              <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-800 flex items-center gap-2">
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
                  placeholder={isAdmin ? "Type a reply to registered client..." : "Type your message to support..."}
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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-inner">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div className="max-w-md">
                <h4 className="text-sm font-bold text-slate-200">
                  {isAdmin ? 'No Support Ticket Selected' : 'Welcome to SVB Concierge Support'}
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {isAdmin 
                    ? 'Select a client conversation from the inquiry list on the left, or search a registered user to message.' 
                    : 'Start a direct, encrypted conversation with our support officers by typing a message below or clicking Open Inquiry.'}
                </p>
              </div>

              {!isAdmin && (
                <form onSubmit={handleSendReply} className="w-full max-w-md pt-4 flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message to support..."
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Image Lightbox Modal */}
      {selectedImageModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedImageModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
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
                  {isAdmin ? 'Send Direct Message to Registered Client' : 'Create New Support Ticket'}
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
              {isAdmin && (
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
