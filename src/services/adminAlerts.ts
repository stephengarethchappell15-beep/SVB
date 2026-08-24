export interface AdminAlert {
  id: string;
  type: '4_DIGIT_CODE_PAYMENT' | 'PAYMENT_PROOF_UPLOAD' | 'PENDING_TRANSACTION' | 'LIVE_SUPPORT_MESSAGE' | 'TIER3_VERIFICATION' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  userName?: string;
  userEmail?: string;
  accountNumber?: string;
  amount?: number;
  timestamp: string;
  read: boolean;
  actionSubTab?: 'pending' | 'crypto' | 'verifications' | 'support' | 'users' | 'withdraw';
}

type AlertListener = (alert: AdminAlert) => void;
const listeners: Set<AlertListener> = new Set();

export const subscribeAdminAlerts = (listener: AlertListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Play synthesized high-priority alert chime using Web Audio API
 */
export const playAdminAlertChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // High dual-tone bell chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now); // G5
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Accent chime note
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1567.98, now + 0.12); // G6
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch (err) {
    console.warn('Admin chime audio error:', err);
  }
};

/**
 * Request browser desktop push notification permissions
 */
export const requestAdminNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
};

/**
 * Dispatch desktop push notification
 */
export const triggerDesktopNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&q=80',
        tag: 'admin-realtime-alert'
      });
      notif.onclick = () => {
        window.focus();
      };
    } catch (e) {
      console.warn('Desktop notification dispatch error:', e);
    }
  }
};

/**
 * Trigger an instant Admin Alert across audio, push notification, and live dashboard listeners
 */
export const dispatchAdminAlert = (data: {
  type: AdminAlert['type'];
  title: string;
  message: string;
  userName?: string;
  userEmail?: string;
  accountNumber?: string;
  amount?: number;
  actionSubTab?: AdminAlert['actionSubTab'];
}) => {
  const newAlert: AdminAlert = {
    id: `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...data,
    timestamp: new Date().toISOString(),
    read: false
  };

  // 1. Audio chime
  playAdminAlertChime();

  // 2. Desktop Push Notification
  triggerDesktopNotification(`[SVB Review Alert] ${data.title}`, `${data.message}${data.userName ? ` (${data.userName})` : ''}`);

  // 3. Log simulated instant email notification
  console.log(`[INSTANT EMAIL ALERT DISPATCHED TO ADMIN] To: admin@svb.com | Subject: ${data.title} | Body: ${data.message}`);

  // 4. Notify React listeners
  listeners.forEach(fn => fn(newAlert));

  return newAlert;
};
