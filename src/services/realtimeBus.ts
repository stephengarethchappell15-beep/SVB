// Lightweight Real-time Event Bus for Instant Cross-Tab & Same-Tab Updates

export type RealtimeEventType = 
  | 'TRANSACTION_UPDATED'
  | 'USER_UPDATED'
  | 'NOTIFICATIONS_UPDATED'
  | 'DEPOSIT_UPDATED'
  | 'SUPPORT_TICKET_UPDATED'
  | 'SUPPORT_MESSAGE'
  | 'SUPPORT_MESSAGE_DELETED'
  | 'TICKET_CREATED'
  | 'SUPPORT_STATUS_UPDATED';

export interface RealtimeEventPayload {
  type: RealtimeEventType;
  userId?: string;
  transactionId?: string;
  ticketId?: string;
  messageId?: string;
  data?: any;
  timestamp: number;
}

const CHANNEL_NAME = 'svb_realtime_events_channel';
const CUSTOM_EVENT_NAME = 'svb_realtime_custom_event';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel initialization error:', e);
  }
}

/**
 * Broadcast a real-time event across all open tabs and components immediately
 */
export function broadcastRealtimeUpdate(
  typeOrObj: RealtimeEventType | { type: RealtimeEventType; data?: any; userId?: string; transactionId?: string; ticketId?: string; messageId?: string; timestamp?: number }, 
  data?: any, 
  userId?: string, 
  transactionId?: string
): void {
  const payload: RealtimeEventPayload = typeof typeOrObj === 'object' 
    ? {
        type: typeOrObj.type,
        userId: typeOrObj.userId,
        transactionId: typeOrObj.transactionId,
        ticketId: typeOrObj.ticketId,
        messageId: typeOrObj.messageId,
        data: typeOrObj.data,
        timestamp: typeOrObj.timestamp || Date.now()
      }
    : {
        type: typeOrObj,
        userId,
        transactionId,
        data,
        timestamp: Date.now()
      };

  // 1. Send via BroadcastChannel for multi-tab synchronization
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {
      console.warn('BroadcastChannel postMessage error:', e);
    }
  }

  // 2. Dispatch custom DOM event for same-tab instant listeners
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_NAME, { detail: payload }));
    } catch (e) {
      console.warn('CustomEvent dispatch error:', e);
    }
  }
}

/**
 * Subscribe to real-time events across same-tab and multi-tab sessions
 */
export function subscribeRealtimeUpdates(callback: (payload: RealtimeEventPayload) => void): () => void {
  const handleMessage = (event: MessageEvent) => {
    if (event.data && event.data.type) {
      callback(event.data as RealtimeEventPayload);
    }
  };

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<RealtimeEventPayload>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleMessage);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener(CUSTOM_EVENT_NAME, handleCustomEvent);
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleMessage);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener(CUSTOM_EVENT_NAME, handleCustomEvent);
    }
  };
}
