import { io, type Socket } from "socket.io-client";
import {
  SocketEvents,
  type ChatMessage,
  type GroupMemberEvent,
  type HazardExpiredEvent,
  type HazardNewEvent,
  type MessageDeletedEvent,
  type MessageReadEvent,
  type MessageUpdatedEvent,
  type LiftAcceptedEvent,
  type LiftClosedEvent,
  type LiftNewEvent,
  type PollUpdatedEvent,
  type PresenceLocationEvent,
  type PresenceStopEvent,
  type PresenceUpdateEvent,
  type ReactionEvent,
  type RideLocationEvent,
  type RideLocationUpdate,
  type RideParticipantEvent,
  type RideStatusEvent,
  type TypingBroadcast,
} from "@moto/contract";
import { API_URL } from "../api/config";
import { getAccessToken, refreshAccessTokenNow } from "../api/client";

/**
 * Single app-wide Socket.IO connection to the chat gateway. The server
 * authenticates the handshake token and auto-joins the socket to a room for
 * every group the user belongs to, so we don't manage room membership here —
 * we just connect once (after sign-in) and subscribe to events.
 */
let socket: Socket | null = null;

export function connectChatSocket(): Socket {
  if (socket?.connected) return socket;
  if (socket) {
    socket.connect();
    return socket;
  }
  socket = io(API_URL, {
    // Allow polling → websocket upgrade. Forcing websocket-only can silently
    // fail on some RN/Expo networks; letting socket.io negotiate is far more
    // reliable and it still upgrades to websocket when possible.
    transports: ["websocket", "polling"],
    // `auth` as a callback is re-evaluated on every (re)connection, so a
    // reconnect after the access token refreshes uses the CURRENT token
    // instead of the stale one captured at creation time. On a cold start the
    // access token is memory-only and not yet populated — refresh first rather
    // than handshake with an empty token (socket.io waits for the callback).
    auth: (cb) => {
      const token = getAccessToken();
      if (token) return cb({ token });
      void refreshAccessTokenNow().then((fresh) => cb({ token: fresh ?? "" }));
    },
    autoConnect: true,
    reconnection: true,
  });
  // Surface connection state in Metro logs so socket issues are obvious.
  socket.on("connect", () =>
    console.log("[chat socket] connected", socket?.id),
  );
  socket.on("connect_error", (e) => {
    console.warn("[chat socket] connect_error:", e.message);
    // Handshake rejected for auth → the access token is stale/expired. Refresh
    // now (single-flight) so the automatic retry handshakes with a valid one.
    if (/unauthorized/i.test(e.message)) void refreshAccessTokenNow();
  });
  socket.on("disconnect", (reason) => {
    console.warn("[chat socket] disconnected:", reason);
    // socket.io never auto-reconnects after a server-initiated disconnect
    // (e.g. session revoked mid-connection) — recover manually with a fresh
    // token. If the refresh fails the session is expired and we stay down.
    if (reason === "io server disconnect") {
      void refreshAccessTokenNow().then((token) => {
        if (token) socket?.connect();
      });
    }
  });
  return socket;
}

/**
 * Ensure the socket is joined to a group's room. The gateway joins rooms for
 * the user's groups on connect, but a group joined *after* connecting won't be
 * covered — so the ChatScreen calls this on mount to guarantee live delivery.
 */
export function joinGroupRoom(groupId: string): void {
  connectChatSocket().emit(SocketEvents.Subscribe, { groupId });
}

export function disconnectChatSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getChatSocket(): Socket | null {
  return socket;
}

/** Emit the ephemeral typing signal for a group. */
export function emitTyping(groupId: string, isTyping: boolean): void {
  socket?.emit(SocketEvents.Typing, { groupId, isTyping });
}

/** Strongly-typed event handlers the ChatScreen registers. */
export interface ChatSocketHandlers {
  onMessageNew?(m: ChatMessage): void;
  onMessageUpdated?(e: MessageUpdatedEvent): void;
  onMessageDeleted?(e: MessageDeletedEvent): void;
  onReactionAdded?(e: ReactionEvent): void;
  onReactionRemoved?(e: ReactionEvent): void;
  onMessageRead?(e: MessageReadEvent): void;
  onTyping?(e: TypingBroadcast): void;
}

/** Subscribe to chat events; returns an unsubscribe cleanup. */
export function subscribeChat(s: Socket, h: ChatSocketHandlers): () => void {
  const pairs: [string, (...args: unknown[]) => void][] = [];
  const on = <T>(event: string, handler?: (payload: T) => void) => {
    if (!handler) return;
    const fn = (payload: unknown) => handler(payload as T);
    s.on(event, fn);
    pairs.push([event, fn]);
  };

  on(SocketEvents.MessageNew, h.onMessageNew);
  on(SocketEvents.MessageUpdated, h.onMessageUpdated);
  on(SocketEvents.MessageDeleted, h.onMessageDeleted);
  on(SocketEvents.ReactionAdded, h.onReactionAdded);
  on(SocketEvents.ReactionRemoved, h.onReactionRemoved);
  on(SocketEvents.MessageRead, h.onMessageRead);
  on(SocketEvents.Typing, h.onTyping);

  return () => {
    for (const [event, fn] of pairs) s.off(event, fn);
  };
}

/** Subscribe to group membership changes (Phase 3); returns an unsubscribe cleanup. */
export function subscribeGroupMembers(
  s: Socket,
  handler: (e: GroupMemberEvent) => void,
): () => void {
  const fn = (payload: unknown) => handler(payload as GroupMemberEvent);
  s.on(SocketEvents.GroupMembersChanged, fn);
  return () => s.off(SocketEvents.GroupMembersChanged, fn);
}

/** Subscribe to live poll vote updates (Phase 5); returns an unsubscribe cleanup. */
export function subscribePolls(
  s: Socket,
  handler: (e: PollUpdatedEvent) => void,
): () => void {
  const fn = (payload: unknown) => handler(payload as PollUpdatedEvent);
  s.on(SocketEvents.PollUpdated, fn);
  return () => s.off(SocketEvents.PollUpdated, fn);
}

/** Live-ride event handlers the LiveRideScreen registers (Phase 6). */
export interface RideSocketHandlers {
  onLocation?(e: RideLocationUpdate): void;
  onParticipantJoined?(e: RideParticipantEvent): void;
  onParticipantLeft?(e: RideParticipantEvent): void;
  onStatus?(e: RideStatusEvent): void;
}

/** Subscribe to live-ride events; returns an unsubscribe cleanup. */
export function subscribeRide(s: Socket, h: RideSocketHandlers): () => void {
  const pairs: [string, (...args: unknown[]) => void][] = [];
  const on = <T>(event: string, handler?: (payload: T) => void) => {
    if (!handler) return;
    const fn = (payload: unknown) => handler(payload as T);
    s.on(event, fn);
    pairs.push([event, fn]);
  };
  on(SocketEvents.RideLocationUpdate, h.onLocation);
  on(SocketEvents.RideParticipantJoined, h.onParticipantJoined);
  on(SocketEvents.RideParticipantLeft, h.onParticipantLeft);
  on(SocketEvents.RideStatus, h.onStatus);
  return () => {
    for (const [event, fn] of pairs) s.off(event, fn);
  };
}

/** Emit the caller's GPS position for a ride (client → server, every 3–5s). */
export function emitRideLocation(payload: RideLocationEvent): void {
  getChatSocket()?.emit(SocketEvents.RideLocation, payload);
}

/**
 * Emit my position for the global nearby map — only when actually connected.
 * Skipping (instead of letting socket.io queue) means a reconnect never floods
 * the server with stale positions; the next GPS tick sends a fresh one.
 */
export function emitPresenceLocation(payload: PresenceLocationEvent): boolean {
  const s = getChatSocket();
  if (!s?.connected) return false;
  s.emit(SocketEvents.PresenceLocation, payload);
  return true;
}

/** Tell the server I closed the nearby map (immediate marker removal). */
export function emitPresenceStop(): void {
  const s = getChatSocket();
  if (s?.connected) s.emit(SocketEvents.PresenceStop);
}

/** Nearby-presence event handlers. */
export interface PresenceSocketHandlers {
  onUpdate?(e: PresenceUpdateEvent): void;
  onStop?(e: PresenceStopEvent): void;
}

/** Subscribe to presence events; returns an unsubscribe cleanup. */
export function subscribePresence(
  s: Socket,
  h: PresenceSocketHandlers,
): () => void {
  const onUpdate = (p: unknown) => h.onUpdate?.(p as PresenceUpdateEvent);
  const onStop = (p: unknown) => h.onStop?.(p as PresenceStopEvent);
  s.on(SocketEvents.PresenceUpdate, onUpdate);
  s.on(SocketEvents.PresenceStop, onStop);
  return () => {
    s.off(SocketEvents.PresenceUpdate, onUpdate);
    s.off(SocketEvents.PresenceStop, onStop);
  };
}

/** Live lift-request event handlers. */
export interface LiftSocketHandlers {
  onNew?(e: LiftNewEvent): void;
  onAccepted?(e: LiftAcceptedEvent): void;
  onClosed?(e: LiftClosedEvent): void;
}

/** Subscribe to lift events; returns an unsubscribe cleanup. */
export function subscribeLifts(s: Socket, h: LiftSocketHandlers): () => void {
  const onNew = (p: unknown) => h.onNew?.(p as LiftNewEvent);
  const onAccepted = (p: unknown) => h.onAccepted?.(p as LiftAcceptedEvent);
  const onClosed = (p: unknown) => h.onClosed?.(p as LiftClosedEvent);
  s.on(SocketEvents.LiftNew, onNew);
  s.on(SocketEvents.LiftAccepted, onAccepted);
  s.on(SocketEvents.LiftClosed, onClosed);
  return () => {
    s.off(SocketEvents.LiftNew, onNew);
    s.off(SocketEvents.LiftAccepted, onAccepted);
    s.off(SocketEvents.LiftClosed, onClosed);
  };
}

/** Join the hazard broadcast room so `hazard:*` events arrive (Phase 7). */
export function joinHazardRoom(): void {
  connectChatSocket().emit(SocketEvents.HazardSubscribe);
}

/** Live-hazard event handlers. */
export interface HazardSocketHandlers {
  onNew?(e: HazardNewEvent): void;
  onExpired?(e: HazardExpiredEvent): void;
}

/** Subscribe to hazard events; returns an unsubscribe cleanup. */
export function subscribeHazards(
  s: Socket,
  h: HazardSocketHandlers,
): () => void {
  const onNew = (p: unknown) => h.onNew?.(p as HazardNewEvent);
  const onExpired = (p: unknown) => h.onExpired?.(p as HazardExpiredEvent);
  s.on(SocketEvents.HazardNew, onNew);
  s.on(SocketEvents.HazardExpired, onExpired);
  return () => {
    s.off(SocketEvents.HazardNew, onNew);
    s.off(SocketEvents.HazardExpired, onExpired);
  };
}
