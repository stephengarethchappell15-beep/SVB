import React from 'react';
import { UserNotification } from '../types';
import { Bell, Check, X, ArrowDownRight, Sparkles } from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  notifications: UserNotification[];
  onClose: () => void;
  onMarkAllRead: () => void;
}

const cleanNotificationText = (str: string) => {
  if (!str) return '';
  return str
    .replace(/Compliance Admin/gi, 'SVB Review')
    .replace(/Compliance team/gi, 'SVB Review team')
    .replace(/Bank Compliance/gi, 'SVB Review')
    .replace(/SVB Compliance/gi, 'SVB Review')
    .replace(/SVB Administration/gi, 'SVB Review')
    .replace(/system administrator/gi, 'SVB Review team')
    .replace(/administrator queue/gi, 'SVB Review queue')
    .replace(/admin queue/gi, 'SVB Review queue')
    .replace(/approval queue/gi, 'SVB Review queue')
    .replace(/admin review/gi, 'SVB Review')
    .replace(/administrator/gi, 'SVB Review')
    .replace(/by Compliance/gi, 'by SVB Review')
    .replace(/by Admin/gi, 'by SVB Review')
    .replace(/\bAdmin\b/g, 'SVB Review')
    .replace(/\badmin\b/g, 'SVB Review');
};

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  notifications,
  onClose,
  onMarkAllRead
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-slideLeft">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">Account Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p>No notifications recorded yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-2xl border text-xs transition-all ${
                  n.read
                    ? 'bg-slate-950/40 border-slate-800/60 text-slate-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100 font-medium'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {cleanNotificationText(n.title)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-200 mt-1 leading-relaxed">{cleanNotificationText(n.message)}</p>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono">Ref: {n.reference}</span>
                  <span className="font-bold text-emerald-400">+{n.currency} ${n.amount.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
