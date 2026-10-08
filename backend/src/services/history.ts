import { config } from '../config.js';
import type { ConversationMessage } from './groq.js';

/**
 * Prototype conversation store: a plain in-memory Map keyed by session id.
 *
 * Trade-offs that are fine for a first version and worth knowing about:
 *  - history disappears when the server restarts;
 *  - it is per-process, so it does not work behind multiple instances;
 *  - images stay in memory as base64 data URLs (2048 tokens each), so the
 *    newest `MAX_HISTORY_MESSAGES` messages are the ones actually replayed.
 * Swap this module for Redis or a database when the prototype grows up.
 */
const conversations = new Map<string, ConversationMessage[]>();

export function getHistory(sessionId: string): ConversationMessage[] {
  return conversations.get(sessionId) ?? [];
}

function trimHistory(history: ConversationMessage[]): ConversationMessage[] {
  let trimmed = history.slice(-config.limits.maxHistoryMessages);
  // Some providers reject a conversation that starts with an assistant turn.
  while (trimmed.length > 0 && trimmed[0]?.role === 'assistant') {
    trimmed = trimmed.slice(1);
  }
  return trimmed;
}

function evictOldestConversation(): void {
  // Map iteration follows insertion order, so the first key is the oldest.
  const oldest = conversations.keys().next();
  if (!oldest.done) conversations.delete(oldest.value);
}

export function appendToHistory(sessionId: string, ...messages: ConversationMessage[]): void {
  const history = [...getHistory(sessionId), ...messages];
  conversations.set(sessionId, trimHistory(history));

  if (conversations.size > config.limits.maxConversations) {
    evictOldestConversation();
  }
}

export function clearHistory(sessionId: string): void {
  conversations.delete(sessionId);
}

export function conversationCount(): number {
  return conversations.size;
}
