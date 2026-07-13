// A 1:1 conversation id is a deterministic, order-independent pairing of
// the two participant ids so both sides derive the same id independently.
export function conversationIdFor(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(":");
}

// Conversation ids encode their two participants, so membership can be
// checked without an extra lookup table.
export function isConversationParticipant(conversationId: string, userId: string): boolean {
  return conversationId.split(":").includes(userId);
}
