import type { Message } from "./api";

// A message can reach the UI twice: once from the REST response of the
// request that created it (optimistic append) and again from the Socket.io
// broadcast the server sends to everyone in the conversation room,
// including the sender. Insert-by-id keeps that idempotent either order.
export function appendMessage(prev: Message[], next: Message): Message[] {
  if (prev.some((m) => m.id === next.id)) return prev;
  return [...prev, next];
}
