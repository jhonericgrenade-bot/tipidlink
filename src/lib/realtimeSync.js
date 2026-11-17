import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Universal Multi-Tier Realtime Sync for TipidLink:
 * 1. Supabase WebSocket Broadcast & Postgres Changes (cross-device: CP, PC, Tablet, etc.)
 * 2. BroadcastChannel API (cross-tab in the same browser)
 * 3. Window Storage Event (fallback for background tabs / older engines)
 */

let globalSyncChannel = null;

export const getGlobalSyncChannel = () => {
  if (!isSupabaseConfigured) return null;
  if (!globalSyncChannel) {
    globalSyncChannel = supabase.channel('tipidlink-shared-sync', {
      config: {
        broadcast: { ack: false, self: false },
      },
    });
    globalSyncChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Connected to Supabase Realtime WebSocket
      }
    });
  }
  return globalSyncChannel;
};

export const broadcastSyncEvent = (event, payload = {}) => {
  const message = {
    ...payload,
    event,
    timestamp: Date.now(),
  };

  // 1. Supabase WebSocket Broadcast (Multi-unit / multi-device)
  const sbChannel = getGlobalSyncChannel();
  if (sbChannel) {
    try {
      sbChannel.send({
        type: 'broadcast',
        event,
        payload: message,
      });
    } catch (e) {
      console.warn('Realtime broadcast notice:', e);
    }
  }

  // 2. Local BroadcastChannel (Multi-tab)
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('tipidlink_realtime_sync');
      bc.postMessage(message);
      bc.close();
    } catch {}
  }

  // 3. LocalStorage Event trigger for cross-tab listeners
  try {
    localStorage.setItem('tipidlink_last_sync_event', JSON.stringify(message));
  } catch {}
};
