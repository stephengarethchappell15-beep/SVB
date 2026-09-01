import React, { useState, useEffect, useRef } from 'react';
import { User, SupportTicket } from '../types';
import { api } from '../services/api';
import { subscribeSupportTicketsFromFirestore } from '../lib/firebase';
import { dbStore } from '../services/dbStore';
import { MessageSquare, X, Send, Headphones, ShieldCheck, Image, CheckCircle2, Mail, ExternalLink } from 'lucide-react';
import { openLiveAgentEmail, openSupportEmail, SUPPORT_EMAIL } from '../utils/supportEmail';

interface SupportChatWidgetProps {
  user: User;
}

export const triggerOpenSVBLiveChat = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('openSVBLiveChat'));
  }
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

  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };
    window.addEventListener('openSVBLiveChat', handleOpenChat);
    return () => {
      window.removeEventListener('openSVBLiveChat', handleOpenChat);
    };
  }, []);

  const fetchUserTickets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getSupportTickets();
      const userTickets = res.tickets || [];
      setTickets(userTickets);

      if (userTickets.length > 0) {
        const latest = userTickets[0]; // most recent
        setActiveTicket(latest);

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

    const unsub = subscribeSupportTicketsFromFirestore(user.id, false, (fsTickets) => {
      if (fsTickets && fsTickets.length > 0) {
        fsTickets.forEach(t => dbStore.addSupportTicket(t));
        setTickets(fsTickets);
        const latest = fsTickets[0];
        setActiveTicket(latest);
        const lastMsg = latest.messages[latest.messages.length - 1];
        if (lastMsg && lastMsg.senderRole === 'admin' && !isOpen) {
          setHasUnread(true);
        }
      }
    });

    const interval = setInterval(() => {
      fetchUserTickets(true);
    }, 5000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [user.id, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (activeTicket && activeTicket.userRead === false) {
        api.markTicketRead(activeTicket.id, 'user');
        setActiveTicket(prev => prev ? { ...prev, userRead: true } : null);
      }
    }
  }, [isOpen, activeTicket?.id, activeTicket?.messages]);

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

    try {
      setSending(true);
      const images = attachedImage ? [attachedImage] : undefined;

      if (activeTicket) {
        const res = await api.replySupportTicket(activeTicket.id, messageText.trim() || 'Attached Image', images);
        setActiveTicket(res.ticket);
      } else {
        const res = await api.createSupportTicket({
          subject: 'Customer Support Consultation',
          category: 'General',
          priority: 'Medium',
          message: messageText.trim() || 'Attached Image',
          images
        });
        setActiveTicket(res.ticket);
        fetchUserTickets(true);
      }
      setMessageText('');
      setAttachedImage('');
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

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openSupportEmail(user)}
                title={`Email official support desk: ${SUPPORT_EMAIL}`}
                className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40 text-xs">
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
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] ${
                      isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
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
                      <p className="whitespace-pre-wrap">{m.message}</p>

                      {/* Contact Live Agent action button if response mentions contacting a live agent */}
                      {m.senderRole === 'admin' && m.message.toLowerCase().includes('contact a live agent') && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => openLiveAgentEmail(user, { amount: 2500, method: 'Payment Proof Verification' })}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Contact Live Agent</span>
                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                          </button>
                        </div>
                      )}

                      {/* Render attached images */}
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
