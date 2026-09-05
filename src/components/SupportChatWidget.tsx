import React, { useState, useEffect, useRef } from 'react';
import { User, SupportTicket, SupportMessage } from '../types';
import { api } from '../services/api';
import { subscribeSupportTicketsFromFirestore } from '../lib/firebase';
import { dbStore } from '../services/dbStore';
import {
  MessageSquare,
  X,
  Send,
  Headphones,
  ShieldCheck,
  ShieldAlert,
  Image as ImageIcon,
  CheckCircle2,
  Mail,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Lock,
  LogIn,
  AlertCircle,
  Clock
} from 'lucide-react';
import { openLiveAgentEmail, openSupportEmail, SUPPORT_EMAIL } from '../utils/supportEmail';

interface SupportChatWidgetProps {
  user?: User | null;
  authLoading?: boolean;
  onOpenLogin?: () => void;
}

export const triggerOpenSVBLiveChat = (targetView?: 'svc' | 'agent' | 'menu') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('openSVBLiveChat', {
        detail: { view: targetView || 'svc' }
      })
    );
  }
};

export const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({
  user: propUser,
  authLoading = false,
  onOpenLogin
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<'menu' | 'chat'>('menu');

  // Resolved user state: propUser or fallback to dbStore
  const [currentUser, setCurrentUser] = useState<User | null>(propUser || null);

  // Tickets & Chat State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messageText, setMessageText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string>('');
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Synchronize user whenever propUser or auth changes
  useEffect(() => {
    if (propUser) {
      setCurrentUser(propUser);
    } else {
      const local = dbStore.getCurrentUser();
      setCurrentUser(local);
    }
  }, [propUser]);

  // Global event listener to open the widget
  useEffect(() => {
    const handleOpenChat = (e: any) => {
      const targetView = e?.detail?.view;
      setIsOpen(true);
      if (targetView === 'svc') {
        setActiveView('chat');
      } else if (targetView === 'agent') {
        setActiveView('menu');
      }
    };
    window.addEventListener('openSVBLiveChat', handleOpenChat);
    return () => {
      window.removeEventListener('openSVBLiveChat', handleOpenChat);
    };
  }, []);

  // Fetch tickets for the authenticated user
  const fetchUserTickets = async (userToFetch: User, silent = false) => {
    try {
      if (!silent) setLoadingTickets(true);
      const res = await api.getSupportTickets(userToFetch);
      const userTickets = res.tickets || [];
      setTickets(userTickets);

      if (userTickets.length > 0) {
        const latest = userTickets[0];
        setActiveTicket(latest);

        // Check for unread message from support
        const lastMsg = latest.messages[latest.messages.length - 1];
        if (lastMsg && lastMsg.senderRole === 'admin' && !isOpenRef.current) {
          setHasUnread(true);
        }
      }
    } catch (err) {
      console.warn('Failed to load support tickets in widget:', err);
    } finally {
      if (!silent) setLoadingTickets(false);
    }
  };

  // Listen for real-time ticket updates from Firestore
  useEffect(() => {
    if (!currentUser?.id) {
      setTickets([]);
      setActiveTicket(null);
      return;
    }

    fetchUserTickets(currentUser, false);

    const unsub = subscribeSupportTicketsFromFirestore(currentUser.id, false, (fsTickets) => {
      if (fsTickets && fsTickets.length > 0) {
        fsTickets.forEach((t) => dbStore.addSupportTicket(t));
        setTickets(fsTickets);
        const latest = fsTickets[0];
        setActiveTicket(latest);

        const lastMsg = latest.messages[latest.messages.length - 1];
        if (lastMsg && lastMsg.senderRole === 'admin' && !isOpenRef.current) {
          setHasUnread(true);
        }
        setLoadingTickets(false);
      }
    });

    return () => {
      unsub();
    };
  }, [currentUser?.id]);

  // Auto-scroll and mark read when chat is opened
  useEffect(() => {
    if (isOpen && activeView === 'chat') {
      setHasUnread(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (activeTicket && activeTicket.userRead === false) {
        api.markTicketRead(activeTicket.id, 'user');
        setActiveTicket((prev) => (prev ? { ...prev, userRead: true } : null));
      }
    }
  }, [isOpen, activeView, activeTicket?.id, activeTicket?.messages?.length]);

  // Handle Login prompt
  const handleTriggerLogin = () => {
    if (onOpenLogin) {
      onOpenLogin();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('openSVBAuthModal'));
    }
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSendError('Image file size must be under 5MB.');
        return;
      }
      setSendError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send message handler with optimistic update and duplicate prevention
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || sending) return;

    const textToSend = messageText.trim();
    const imgToSend = attachedImage;
    if (!textToSend && !imgToSend) return;

    if (!currentUser) {
      setSendError('Your session is unauthenticated. Please sign in to send messages.');
      return;
    }

    isSubmittingRef.current = true;
    setSending(true);
    setSendError(null);

    // Save values in case retry is needed
    const savedText = textToSend;
    const savedImg = imgToSend;

    // Clear inputs immediately
    setMessageText('');
    setAttachedImage('');

    const nowIso = new Date().toISOString();
    const tempMsgId = `MSG-TEMP-${Date.now()}`;
    const optimisticMsg: SupportMessage = {
      id: tempMsgId,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderRole: 'user',
      message: savedText || 'Attached Image',
      ...(savedImg ? { images: [savedImg] } : {}),
      createdAt: nowIso
    };

    // Optimistically update local active ticket
    if (activeTicket) {
      setActiveTicket((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, optimisticMsg],
              updatedAt: nowIso
            }
          : null
      );
    }

    try {
      const images = savedImg ? [savedImg] : undefined;

      if (activeTicket) {
        const res = await api.replySupportTicket(activeTicket.id, savedText || 'Attached Image', images, currentUser);
        if (res && res.ticket) {
          setActiveTicket(res.ticket);
        }
      } else {
        const res = await api.createSupportTicket(
          {
            subject: 'Client Support Consultation',
            category: 'General',
            priority: 'Medium',
            message: savedText || 'Attached Image',
            images
          },
          currentUser
        );
        if (res && res.ticket) {
          setActiveTicket(res.ticket);
          setTickets([res.ticket]);
        }
      }
    } catch (err: any) {
      console.error('Failed to send support message:', err);
      setSendError(err.message || 'Message could not be delivered. Tap to retry.');
      // Restore the text and image so user doesn't lose work
      setMessageText(savedText);
      setAttachedImage(savedImg);
      // Remove the optimistic temp message
      if (activeTicket) {
        setActiveTicket((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.filter((m) => m.id !== tempMsgId)
              }
            : null
        );
      }
    } finally {
      setSending(false);
      isSubmittingRef.current = false;
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Quick prompt filler for new chat
  const handleQuickPrompt = (prompt: string) => {
    setMessageText(prompt);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Toggle Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            // Default to menu or resume active chat if already communicating
            if (activeTicket && activeTicket.messages.length > 0 && currentUser) {
              setActiveView('chat');
            } else {
              setActiveView('menu');
            }
          }}
          className="relative bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all transform hover:scale-105 border border-emerald-400/30 group"
          title="SVB Client Support"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-slate-950 transition-transform group-hover:scale-110" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-950 animate-ping" />
            )}
          </div>
          <span className="text-xs font-bold tracking-wide">Live Support</span>
          {hasUnread && (
            <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              New
            </span>
          )}
        </button>
      )}

      {/* Floating Widget Modal */}
      {isOpen && (
        <div className="w-[360px] sm:w-[410px] h-[540px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-slate-950 px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeView === 'chat' ? (
                <button
                  type="button"
                  onClick={() => setActiveView('menu')}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                  title="Back to Support Options"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Headphones className="w-4 h-4" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white">
                    {activeView === 'chat' ? 'SVC Online Chat' : 'SVB Client Support Desk'}
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-400">
                  {activeView === 'chat' ? 'Encrypted Banking Session • Online' : '24/7 Dedicated Client Concierge'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openSupportEmail(currentUser || undefined)}
                title={`Email official support desk: ${SUPPORT_EMAIL}`}
                className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {authLoading ? (
            /* Loading State */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-xs font-bold text-slate-200">Verifying Secure Banking Session</p>
                <p className="text-[11px] text-slate-500 mt-1">Connecting to authenticated support server...</p>
              </div>
            </div>
          ) : activeView === 'menu' ? (
            /* 1. SUPPORT OPTIONS MENU */
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40 text-xs">
              {/* Client Status Badge */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      currentUser
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {currentUser ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-200">
                      {currentUser ? currentUser.fullName : 'Guest / Visitor Session'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {currentUser ? `Account: ${currentUser.accountNumber || 'SVB-ONLINE'} • Verified` : 'Authentication Recommended'}
                    </p>
                  </div>
                </div>
                {currentUser && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Active
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider px-1">
                  Select Support Method
                </p>
                <p className="text-[11px] text-slate-400 px-1">
                  Choose how you would like to communicate with Silicon Valley Bank support:
                </p>
              </div>

              {/* OPTION 1: SVC Chat */}
              <div
                onClick={() => {
                  if (currentUser) {
                    setActiveView('chat');
                  } else {
                    handleTriggerLogin();
                  }
                }}
                className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-emerald-500/30 hover:border-emerald-400/60 transition-all cursor-pointer group relative overflow-hidden shadow-lg shadow-emerald-950/20"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                          SVC Chat
                        </h4>
                        <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Inside Website
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        Keep your conversation inside the banking portal. Chat directly with SVB specialists in real-time encrypted messaging.
                      </p>
                    </div>
                  </div>
                  <div className="text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0 pt-1">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-medium">
                    {activeTicket && activeTicket.messages.length > 0
                      ? `Active Conversation (${activeTicket.messages.length} msgs)`
                      : 'Immediate Support Assistance'}
                  </span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    {currentUser ? 'Open SVC Chat' : 'Sign In for SVC Chat'} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* OPTION 2: Live Agent */}
              <div
                onClick={() => openLiveAgentEmail(currentUser || undefined)}
                className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-cyan-500/30 hover:border-cyan-400/60 transition-all cursor-pointer group relative overflow-hidden shadow-lg shadow-cyan-950/20"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                          Live Agent
                        </h4>
                        <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
                          External Email Desk
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        Route your inquiry, wire documents, or payment proof directly to the official SVB Client Service Desk via external email.
                      </p>
                    </div>
                  </div>
                  <div className="text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0 pt-1">
                    <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-cyan-400 font-medium truncate max-w-[200px]">
                    {SUPPORT_EMAIL}
                  </span>
                  <span className="font-bold text-cyan-400 flex items-center gap-1">
                    Connect with Live Agent <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Unauthenticated Security Notice */}
              {!currentUser && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <AlertCircle className="w-4 h-4" />
                    <span>Authentication Required for SVC Chat</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    SVC Chat connects directly to your verified SVB account records. Please sign in to launch encrypted online chat.
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerLogin}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In to Access SVC Chat</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 2. SVC CHAT VIEW */
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/50">
              {/* Authenticated Check inside Chat */}
              {!currentUser ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Authentication Required</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
                      Your session is not logged in. Please sign in with your SVB account to start a secure chat session.
                    </p>
                  </div>
                  <div className="w-full max-w-[260px] space-y-2">
                    <button
                      type="button"
                      onClick={handleTriggerLogin}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign In to SVB</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openSupportEmail()}
                      className="w-full bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
                    >
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Email Live Agent Instead</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                    {loadingTickets ? (
                      <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : !activeTicket || activeTicket.messages.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200 text-xs">SVB Online Chat Desk</p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
                            Welcome, {currentUser.fullName}. Send a message below to connect directly with our support desk.
                          </p>
                        </div>

                        {/* Quick Prompts */}
                        <div className="pt-2 space-y-1.5 text-left max-w-[280px] mx-auto">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                            Common Consultations
                          </p>
                          <button
                            type="button"
                            onClick={() => handleQuickPrompt('I would like to verify my wire transfer status.')}
                            className="w-full text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] transition-colors flex items-center justify-between"
                          >
                            <span>Wire Transfer Status</span>
                            <ArrowRight className="w-3 h-3 text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickPrompt('I have questions regarding my 4-Digit Outgoing Transfer Code.')}
                            className="w-full text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] transition-colors flex items-center justify-between"
                          >
                            <span>4-Digit Authorization Code</span>
                            <ArrowRight className="w-3 h-3 text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickPrompt('I am submitting payment proof for account review.')}
                            className="w-full text-left p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] transition-colors flex items-center justify-between"
                          >
                            <span>Submit Payment Proof</span>
                            <ArrowRight className="w-3 h-3 text-emerald-400" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      activeTicket.messages.map((m) => {
                        const isUser = m.senderRole === 'user';
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col max-w-[85%] ${
                              isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                            }`}
                          >
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                              <span className="font-semibold text-slate-300">
                                {isUser ? 'You' : m.senderName || 'SVB Support'}
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div
                              className={`p-3 rounded-2xl text-xs space-y-2 ${
                                isUser
                                  ? 'bg-emerald-600/30 border border-emerald-500/40 rounded-tr-none text-slate-100'
                                  : 'bg-slate-900 border border-slate-800 rounded-tl-none text-slate-200'
                              }`}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>

                              {/* Action prompt if response recommends live agent email */}
                              {m.senderRole === 'admin' &&
                                m.message.toLowerCase().includes('contact a live agent') && (
                                  <div className="pt-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openLiveAgentEmail(currentUser, {
                                          amount: 2500,
                                          method: 'Payment Proof Verification'
                                        })
                                      }
                                      className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                      <span>Dispatch to Live Agent</span>
                                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                                    </button>
                                  </div>
                                )}

                              {/* Attached Images */}
                              {m.images && m.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {m.images.map((img, idx) => (
                                    <img
                                      key={idx}
                                      src={img}
                                      alt="Attached proof"
                                      onClick={() => setSelectedImageModal(img)}
                                      className="w-24 h-24 object-cover rounded-xl border border-slate-700 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Send Error Notice with Retry */}
                  {sendError && (
                    <div className="px-3 py-2 bg-rose-500/10 border-t border-rose-500/20 flex items-center justify-between text-xs text-rose-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{sendError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        className="font-bold underline text-[11px] ml-2 shrink-0 hover:text-rose-300 cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Attached Image Preview */}
                  {attachedImage && (
                    <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs px-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={attachedImage}
                          alt="Attachment"
                          className="w-8 h-8 object-cover rounded-lg border border-slate-700"
                        />
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Image attached
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedImage('')}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Input Footer */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
                  >
                    <label
                      className="p-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-cyan-400 rounded-xl border border-slate-800 cursor-pointer transition-colors shrink-0"
                      title="Attach Image / Screenshot"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <ImageIcon className="w-4 h-4" />
                    </label>

                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        if (sendError) setSendError(null);
                      }}
                      placeholder="Type a message to SVB Support..."
                      className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={sending || (!messageText.trim() && !attachedImage)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-emerald-500 shrink-0 cursor-pointer"
                      title="Send Message"
                    >
                      {sending ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Image Lightbox Modal */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImageModal}
              alt="Full view"
              className="max-h-[80vh] w-auto mx-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
