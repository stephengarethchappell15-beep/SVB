import React, { useState, useEffect, useRef } from 'react';
import { User, SupportTicket, SupportMessage } from '../types';
import { api } from '../services/api';
import { 
  subscribeSupportTicketsFromFirestore, 
  subscribeTicketMessagesFromFirestore,
  getTicketMessagesFromFirestore,
  mergeSupportTickets 
} from '../lib/firebase';
import { dbStore } from '../services/dbStore';
import { subscribeRealtimeUpdates } from '../services/realtimeBus';
import { MessageSquare, X, Send, Headphones, ShieldCheck, Image, CheckCircle2, CheckCheck } from 'lucide-react';

interface SupportChatWidgetProps {
  user: User;
}

const isSameTicketId = (id1?: string, id2?: string): boolean => {
  if (!id1 || !id2) return false;
  if (id1 === id2) return true;
  const clean1 = id1.replace(/^TICKET-/, '').trim().toLowerCase();
  const clean2 = id2.replace(/^TICKET-/, '').trim().toLowerCase();
  return clean1 === clean2;
};

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
        const latest = userTickets[0]; // most recent
        setActiveTicket(prev => prev ? mergeSupportTickets(prev, latest) : latest);

        // Check if latest message is from support and created recently or unread
        const lastMsg = latest.messages[latest.messages.length - 1];
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

    const unsubFirestore = subscribeSupportTicketsFromFirestore(user.id, false, (fsTickets) => {
      if (fsTickets) {
        fsTickets.forEach(t => dbStore.addSupportTicket(t));
        const userTickets = fsTickets.filter(t => 
          t.userId === user.id || 
          (t.userEmail && user.email && t.userEmail.toLowerCase() === user.email.toLowerCase())
        );
        setTickets(userTickets);
        if (userTickets.length > 0) {
          const latest = userTickets[0];
          setActiveTicket(prev => prev ? mergeSupportTickets(prev, latest) : latest);
          const lastMsg = latest.messages[latest.messages.length - 1];
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
        // Optimistic UI append
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
        setActiveTicket(prev => prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev);
        scrollToBottom(false);

        const res = await api.replySupportTicket(activeTicket.id, msgToSend, images);
        setActiveTicket(prev => prev ? mergeSupportTickets(prev, res.ticket) : res.ticket);
      } else {
        const res = await api.createSupportTicket({
          subject: 'Customer Support Consultation',
          category: 'General',
          priority: 'Medium',
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

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all transform hover:scale-105 border border-emerald-400/30"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-slate-950" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-950 animate-ping" />
            )}
          </div>
          <span className="text-xs font-bold tracking-wide">Live Support</span>
          {hasUnread && (
            <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              New
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white">SVB Customer Support</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-slate-400">24/7 Dedicated Client Desk • Online</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
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
              <div className="text-center py-10 text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-xs">Welcome to Client Support</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto">
                    How can we assist you today? Send a message or upload deposit proof screenshots below.
                  </p>
                </div>
              </div>
            ) : (
              activeTicket.messages.map((m) => {
                const isUser = m.senderRole === 'user';
                const messageIdentifier = m.id || `${m.senderId}-${m.message}-${m.createdAt}`;

                return (
                  <div
                    key={messageIdentifier}
                    className={`group/msg flex flex-col max-w-[85%] ${
                      isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                      <span className="font-semibold text-slate-300">
                        {isUser ? 'You' : (m.senderName || 'Customer Support')}
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
                      <p className="whitespace-pre-wrap">{extractMessageText(m)}</p>

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
                className="text-slate-400 hover:text-rose-400 p-1"
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
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded-xl transition-all disabled:opacity-50 shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
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
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800"
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
