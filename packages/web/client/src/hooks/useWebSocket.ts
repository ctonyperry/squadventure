/**
 * WebSocket Hook
 *
 * Manages WebSocket connection and real-time updates.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

interface WSMessage {
  type: string;
  payload: unknown;
  timestamp: string;
}

export function useWebSocket(): {
  isConnected: boolean;
  send: (message: WSMessage) => void;
} {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const setConnected = useGameStore((state) => state.setConnected);
  const updateState = useGameStore((state) => state.updateState);
  const connected = useGameStore((state) => state.connected);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        scheduleReconnect();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      scheduleReconnect();
    }
  }, [setConnected]);

  const handleMessage = (message: WSMessage) => {
    const { type, payload } = message;

    switch (type) {
      case 'state_update':
        updateState(payload as Parameters<typeof updateState>[0]);
        break;

      case 'entity_updated':
        // Handle entity updates
        console.log('Entity updated:', payload);
        break;

      case 'combat_state_changed':
        // Handle combat state changes
        console.log('Combat state changed:', payload);
        break;

      case 'turn_taken':
        // Handle turn events
        console.log('Turn taken:', payload);
        break;

      case 'dice_rolled':
        // Handle dice roll events
        console.log('Dice rolled:', payload);
        break;

      default:
        console.log('Unknown message type:', type);
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) return;
    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connect();
    }, 3000);
  };

  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected: connected, send };
}
