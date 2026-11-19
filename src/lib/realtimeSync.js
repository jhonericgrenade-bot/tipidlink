import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Universal Multi-Tier Realtime Sync for TipidLink:
 * 1. Supabase WebSocket Broadcast (cross-unit: CP, PC, Tablet, Android, iOS)
 * 2. BroadcastChannel API (cross-tab in the same browser)
 * 3. Window Storage Event (fallback for background tabs / older engines)
 */

const SYNC_CHANNEL_NAME = 'tipidlink-shared-sync';
const syncListeners = new Set();
const pendingQueue = [];
let globalSyncChannel = null;
let isChannelSubscribed = false;
let globalBc = null;

// Match helper to connect Santos aliases ('hh-santos-family' and UUID '0d37e235-c9dd-4876-a54a-9acb36516599')
export const isMatchingHouseholdId = (id1, id2, code1, code2) => {
  if (!id1 || !id2) return true;
  if (id1 === id2) return true;
  const santosAliases = ['hh-santos-family', '0d37e235-c9dd-4876-a54a-9acb36516599'];
  if (santosAliases.includes(id1) && santosAliases.includes(id2)) return true;
  if (code1 && code2 && String(code1).trim().toUpperCase() === String(code2).trim().toUpperCase()) return true;
  return false;
};

// Notify all local listeners (HouseholdContext, FinanceContext, etc.)
const notifyListeners = (event, payload = {}) => {
  syncListeners.forEach((listener) => {
    try {
      listener(event, payload);
    } catch (err) {
      console.warn('Sync listener execution warning:', err);
    }
  });
};

// Initialize Supabase WebSocket Channel with full bidirectional broadcast handling
export const initGlobalSync = () => {
  if (!isSupabaseConfigured) return null;

  if (!globalSyncChannel) {
    globalSyncChannel = supabase.channel(SYNC_CHANNEL_NAME, {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    // Listen to ALL broadcast events from other devices
    globalSyncChannel
      .on('broadcast', { event: 'household_updated' }, (msg) => {
        notifyListeners('household_updated', msg.payload);
      })
      .on('broadcast', { event: 'finance_updated' }, (msg) => {
        notifyListeners('finance_updated', msg.payload);
      })
      .on('broadcast', { event: 'member_joined' }, (msg) => {
        notifyListeners('member_joined', msg.payload);
      })
      .on('broadcast', { event: 'member_updated' }, (msg) => {
        notifyListeners('member_updated', msg.payload);
      })
      .on('broadcast', { event: 'household_premium_updated' }, (msg) => {
        notifyListeners('household_premium_updated', msg.payload);
      })
      .on('broadcast', { event: '*' }, (msg) => {
        if (msg.event && !['household_updated', 'finance_updated', 'member_joined', 'member_updated', 'household_premium_updated'].includes(msg.event)) {
          notifyListeners(msg.event, msg.payload);
        }
      });

    globalSyncChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isChannelSubscribed = true;
        // Flush any pending messages that were queued before handshake
        while (pendingQueue.length > 0) {
          const item = pendingQueue.shift();
          try {
            globalSyncChannel.send({
              type: 'broadcast',
              event: item.event,
              payload: item.message,
            });
          } catch (e) {
            console.warn('Flushing queued broadcast error:', e);
          }
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        isChannelSubscribed = false;
      }
    });
  }

  // Local BroadcastChannel initialization (single persistent instance)
  if (typeof BroadcastChannel !== 'undefined' && !globalBc) {
    try {
      globalBc = new BroadcastChannel('tipidlink_realtime_sync');
      globalBc.onmessage = (event) => {
        if (event.data?.event) {
          notifyListeners(event.data.event, event.data);
        }
      };
    } catch {}
  }

  // Cross-tab storage fallback listener
  if (typeof window !== 'undefined') {
    const handleStorage = (e) => {
      if (e.key === 'tipidlink_last_sync_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.event) {
            notifyListeners(parsed.event, parsed);
          }
        } catch {}
      }
    };
    window.removeEventListener('storage', handleStorage);
    window.addEventListener('storage', handleStorage);
  }

  return globalSyncChannel;
};

export const getGlobalSyncChannel = () => {
  return initGlobalSync();
};

/**
 * Register a listener for ANY sync event across all units/devices.
 * Returns an unsubscription function.
 */
export const subscribeToSyncEvents = (callback) => {
  initGlobalSync();
  syncListeners.add(callback);
  return () => {
    syncListeners.delete(callback);
  };
};

/**
 * Broadcast an event to all other units (CP, PC, other devices, other tabs).
 */
export const broadcastSyncEvent = (event, payload = {}) => {
  const message = {
    ...payload,
    event,
    timestamp: Date.now(),
  };

  // 1. Supabase WebSocket Broadcast (Cross-device: CP, PC, Tablet)
  const sbChannel = getGlobalSyncChannel();
  if (sbChannel) {
    if (isChannelSubscribed) {
      try {
        sbChannel.send({
          type: 'broadcast',
          event,
          payload: message,
        });
      } catch (e) {
        console.warn('Realtime cross-unit broadcast notice:', e);
      }
    } else {
      // Queue for transmission once channel subscription establishes
      pendingQueue.push({ event, message });
    }
  }

  // 2. Local BroadcastChannel (Cross-tab)
  try {
    if (globalBc) {
      globalBc.postMessage(message);
    } else if (typeof BroadcastChannel !== 'undefined') {
      const tempBc = new BroadcastChannel('tipidlink_realtime_sync');
      tempBc.postMessage(message);
      tempBc.close();
    }
  } catch {}

  // 3. Storage event fallback (Background tabs / WebViews)
  try {
    localStorage.setItem('tipidlink_last_sync_event', JSON.stringify(message));
  } catch {}
};
