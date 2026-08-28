import React, { useState, useEffect, useRef } from 'react';
import { User, SupportTicket, SupportMessage } from '../types';
import { api } from '../services/api';
import { 
  subscribeSupportTicketsFromFirestore, 
  subscribeTicketMessagesFromFirestore,
  getTicketMessagesFromFirestore,
  mergeSupportTickets,
  isSameTicketId
} from '../lib/firebase';
import { dbStore } from '../services/dbStore';
import { subscribeRealtimeUpdates } from '../services/realtimeBus';
import { 
  MessageSquare, 
  X, 
  Send, 
  Headphones, 
  ShieldCheck, 
  Image, 
  CheckCircle2, 
  CheckCheck, 
  Mail, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowRight, 
  Bot, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface SupportChatWidgetProps {
  user: User;
}

const SUPPORT_EMAIL = 'siliconvalleybank51@gmail.com';

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

export const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showChoicePrompt, setShowChoicePrompt] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messageText, setMessageText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  const scrollToBottom = (instant = false) => {
    const scroll = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: instant ? 'auto' : 'smooth'
        });
      }
      chatEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'end' });
    };

    scroll();
    setTimeout(scroll, 50);
    setTimeout(scroll, 180);
  };

  const fetchUserTickets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getSupportTickets();
      const userTickets = (res.tickets || []).filter(t => 
        t.userId === user.id || 
        (t.userEmail && user.email && t.userEmail.toLowerCase() === user.email.toLowerCase())
      );
      setTickets(userTickets);

      if (userTickets.length > 0) {
        setActiveTicket(prev => {
          if (prev) {
            const matched = userTickets.find(t => isSameTicketId(t.id, prev.id) || isSameTicketId(t.chatId, prev.id));
            if (matched) {
              return mergeSupportTickets(prev, matched);
            }
          }
          return userTickets[0];
        });

        const activeT = userTickets[0];
        const lastMsg = activeT.messages[activeT.messages.length - 1];
        if (lastMsg && lastMsg.senderRole === 'admin' && !isOpen) {
          setHasUnread(true);
        }
      }
    } catch (err) {
      console.error('Failed to load support chat:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTickets();

    const unsubFirestore = subscribeSupportTicketsFromFirestore({ id: user.id, email: user.email }, false, (fsTickets) => {
      if (fsTickets) {
        fsTickets.forEach(t => dbStore.addSupportTicket(t));
        const userTickets = fsTickets.filter(t => 
          t.userId === user.id || 
          (t.userEmail && user.email && t.userEmail.toLowerCase() === user.email.toLowerCase())
        );
        setTickets(userTickets);
        if (userTickets.length > 0) {
          setActiveTicket(prev => {
            if (prev) {
              const matched = userTickets.find(t => isSameTicketId(t.id, prev.id) || isSameTicketId(t.chatId, prev.id));
              if (matched) {
                return mergeSupportTickets(prev, matched);
              }
            }
            return userTickets[0];
          });

          const activeT = userTickets[0];
          const lastMsg = activeT.messages[activeT.messages.length - 1];
          if (lastMsg && lastMsg.senderRole === 'admin' && !isOpen) {
            setHasUnread(true);
          }
        }
      }
    });

    const unsubRealtimeBus = subscribeRealtimeUpdates((event) => {
      if (event.type.includes('SUPPORT') || event.type.includes('TICKET')) {
        fetchUserTickets(true);
      }
    });

    const interval = setInterval(() => {
      fetchUserTickets(true);
    }, 4000);

    return () => {
      unsubFirestore();
      unsubRealtimeBus();
      clearInterval(interval);
    };
  }, [user.id, user.email, isOpen]);

  // Live direct subcollection and root message listener for the active ticket
  useEffect(() => {
    if (!activeTicket || !activeTicket.id) return;
    const ticketId = activeTicket.id;

    // Proactively fetch initial messages
    getTicketMessagesFromFirestore(ticketId).then(messages => {
      if (messages && messages.length > 0) {
        setActiveTicket(prev => {
          if (!prev) return prev;
          return mergeSupportTickets(prev, { ...prev, messages });
        });
      }
    });

    // Real-time snapshot listener
    const unsubMessages = subscribeTicketMessagesFromFirestore(ticketId, (liveMessages) => {
      if (liveMessages && liveMessages.length > 0) {
        setActiveTicket(prev => {
          if (!prev) return prev;
          const merged = mergeSupportTickets(prev, { ...prev, messages: liveMessages });
          const last = liveMessages[liveMessages.length - 1];
          if (last && last.senderRole === 'admin' && !isOpen) {
            setHasUnread(true);
          }
          return merged;
        });
        scrollToBottom(false);
      }
    });

    return () => {
      unsubMessages();
    };
  }, [activeTicket?.id, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      scrollToBottom(false);
    }
  }, [isOpen, activeTicket?.id, activeTicket?.messages?.length]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must be under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && !attachedImage) return;

    const msgToSend = messageText.trim() || 'Attached Image';
    const images = attachedImage ? [attachedImage] : undefined;
    const nowIso = new Date().toISOString();

    setMessageText('');
    setAttachedImage('');

    try {
      setSending(true);

      if (activeTicket) {
        // Optimistic UI append for user message only
        const optimisticMsg: SupportMessage = {
          id: `msg-opt-${Date.now()}`,
          ticketId: activeTicket.id,
          chatId: activeTicket.id,
          threadId: activeTicket.id,
          roomId: activeTicket.id,
          senderId: user.id,
          senderName: user.fullName,
          senderRole: 'user',
          message: msgToSend,
          images,
          createdAt: nowIso
        };

        setActiveTicket(prev => prev ? { 
          ...prev, 
          messages: [...(prev.messages || []), optimisticMsg] 
        } : prev);
        scrollToBottom(false);

        const res = await api.replySupportTicket(activeTicket.id, msgToSend, images);
        setActiveTicket(prev => prev ? mergeSupportTickets(prev, res.ticket) : res.ticket);
      } else {
        const res = await api.createSupportTicket({
          subject: 'SVB Priority Client Consultation',
          category: 'General',
          priority: 'High',
          message: msgToSend,
          images
        });
        setActiveTicket(res.ticket);
        fetchUserTickets(true);
      }
      scrollToBottom(false);
    } catch (err: any) {
      alert(err.message || 'Failed to send message to Customer Support.');
    } finally {
      setSending(false);
    }
  };

  // Helper to render formatted message content: bot offline notices get the action card, while all admin replies and user messages render as clean standard text bubbles
  const renderMessageContent = (m: any, text: string) => {
    const isBotOfflineMessage = 
      m?.senderId === 'svb-live-agent-bot' || 
      (m?.senderRole !== 'user' && text.includes('Kindly hold on, our support is currently unavailable'));

    if (isBotOfflineMessage) {
      const parts = text.split(SUPPORT_EMAIL);
      return (
        <div className="space-y-2.5">
          <p className="whitespace-pre-wrap leading-relaxed">
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

          {/* Quick Action Button for Live Agent ONLY on the initial automated offline card */}
          <div className="pt-1.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenLiveAgentEmail}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-[11px] shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Message Live Agent</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              title="Copy email address"
            >
              {copiedEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      );
    }

    // Clean standard text bubble for human admin/support replies and user messages
    if (text.includes(SUPPORT_EMAIL)) {
      const parts = text.split(SUPPORT_EMAIL);
      return (
        <p className="whitespace-pre-wrap leading-relaxed break-words">
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

    return <p className="whitespace-pre-wrap leading-relaxed break-words">{text}</p>;
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && !showChoicePrompt && (
        <button
          onClick={() => setShowChoicePrompt(true)}
          className="relative bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all transform hover:scale-105 border border-emerald-400/30 cursor-pointer"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-slate-950" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-950 animate-ping" />
            )}
          </div>
          <span className="text-xs font-bold tracking-wide">Live Chat</span>
          {hasUnread && (
            <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              New
            </span>
          )}
        </button>
      )}

      {/* DUAL SUPPORT CHOICE PROMPT MODAL / POPUP */}
      {showChoicePrompt && !isOpen && (
        <div className="w-[340px] sm:w-[380px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-sm">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400">
                  <Headphones className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">Silicon Valley Bank Support</h3>
                <p className="text-[10px] text-slate-400">Select your preferred support channel</p>
              </div>
            </div>
            <button
              onClick={() => setShowChoicePrompt(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* OPTION 1: LIVE AGENT (Direct Native Email Client) */}
            <div 
              onClick={() => {
                handleOpenLiveAgentEmail();
                setShowChoicePrompt(false);
              }}
              className="group p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 hover:border-amber-400 rounded-2xl cursor-pointer transition-all duration-200 shadow-md hover:shadow-amber-500/10 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Live Agent</span>
                      <span className="bg-amber-500/20 text-amber-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-amber-500/30">
                        Priority
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Email directly via your native inbox</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
              </div>

              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="font-mono text-amber-300/90 truncate max-w-[200px]">{SUPPORT_EMAIL}</span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="text-slate-400 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
                >
                  {copiedEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* OPTION 2: SVB LIVE (In-App Live Chat Interface) */}
            <div 
              onClick={() => {
                setShowChoicePrompt(false);
                setIsOpen(true);
              }}
              className="group p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 hover:border-emerald-400 rounded-2xl cursor-pointer transition-all duration-200 shadow-md hover:shadow-emerald-500/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>SVB Live</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </h4>
                    <p className="text-[10px] text-slate-400">Open in-app interactive live chat</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Panel (SVB Live) */}
      {isOpen && (
        <div className="w-[360px] sm:w-[410px] h-[540px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white">SVB Live Chat</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-400">Dedicated Client Support • Online</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenLiveAgentEmail}
                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Message Live Agent via email"
              >
                <Mail className="w-3 h-3" />
                <span>Live Agent</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Notice Bar */}
          <div className="bg-amber-950/30 border-b border-amber-500/20 px-3 py-1.5 flex items-center justify-between text-[10px] text-amber-300">
            <span className="flex items-center gap-1 truncate">
              <Mail className="w-3 h-3 shrink-0" />
              <span>Live Agent: <span className="font-mono underline">{SUPPORT_EMAIL}</span></span>
            </span>
            <button
              onClick={handleOpenLiveAgentEmail}
              className="text-amber-400 hover:text-white font-bold ml-2 underline shrink-0 cursor-pointer"
            >
              Email Now
            </button>
          </div>

          {/* Messages Body */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40 text-xs scroll-smooth"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !activeTicket || activeTicket.messages.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-xs">SVB Live In-App Chat</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
                    Type your message below. For urgent assistance, message our live agent directly at <span className="text-amber-400 underline font-mono cursor-pointer" onClick={handleOpenLiveAgentEmail}>{SUPPORT_EMAIL}</span>.
                  </p>
                </div>
              </div>
            ) : (
              activeTicket.messages.map((m) => {
                const isUser = m.senderRole === 'user';
                const messageIdentifier = m.id || `${m.senderId}-${m.message}-${m.createdAt}`;
                const text = extractMessageText(m);

                return (
                  <div
                    key={messageIdentifier}
                    className={`group/msg flex flex-col max-w-[90%] ${
                      isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                      <span className="font-semibold text-slate-300">
                        {isUser ? 'You' : (m.senderName || 'SVB Support Desk')}
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
                      className={`p-3.5 rounded-2xl text-xs space-y-2 ${
                        isUser
                          ? 'bg-emerald-600/30 border border-emerald-500/40 rounded-tr-none text-slate-100'
                          : 'bg-slate-900 border border-slate-800 rounded-tl-none text-slate-200'
                      }`}
                    >
                      {renderMessageContent(m, text)}

                      {/* Render attached images */}
                      {m.images && m.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {m.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt="Attached proof"
                              onLoad={() => scrollToBottom(false)}
                              onClick={() => setSelectedImageModal(img)}
                              className="w-24 h-24 object-cover rounded-xl border border-slate-700 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 pt-0.5">
                        <span>{new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isUser && <CheckCheck className="w-3 h-3 text-emerald-400" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Attached Image Preview */}
          {attachedImage && (
            <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs px-3">
              <div className="flex items-center gap-2">
                <img src={attachedImage} alt="Attachment" className="w-8 h-8 object-cover rounded-lg border border-slate-700" />
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Image attached
                </span>
              </div>
              <button
                onClick={() => setAttachedImage('')}
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Footer */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <label className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-xl border border-slate-800 cursor-pointer transition-colors shrink-0" title="Attach Image">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Image className="w-4 h-4" />
            </label>

            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type message or attach image..."
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={sending || (!messageText.trim() && !attachedImage)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded-xl transition-all disabled:opacity-50 shrink-0 cursor-pointer"
              title="Send Message"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}

      {/* Image Modal Lightbox */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
            <button
              onClick={() => setSelectedImageModal(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedImageModal} alt="Full view" className="max-h-[80vh] w-auto mx-auto rounded-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
