import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/**
 * Central place for every environment-driven setting.
 * Nothing else in the codebase reads `process.env` directly, so it is always
 * obvious where a value comes from and what its default is.
 */

// `backend/src` -> `backend`
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load `backend/.env` first (most specific), then fall back to the project-root
// `.env`. dotenv never overwrites already-set variables, so real environment
// variables always take precedence.
dotenv.config({ path: path.join(backendDir, '.env') });
dotenv.config({ path: path.resolve(backendDir, '..', '.env') });

function readInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

const DEFAULT_SYSTEM_PROMPT = [
  'You are a helpful multimodal assistant inside a chat application.',
  'When the user includes an image, ground your answer in what is actually visible in it.',
  'Be concise, use plain text, and ask a clarifying question if the request is ambiguous.',
].join(' ');

export const config = {
  port: readInt('PORT', 3001),

  /** Browser origins allowed to call the API directly (Vite dev server by default). */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  groq: {
    apiKey: process.env.GROQ_API_KEY?.trim() ?? '',
    baseUrl: (process.env.GROQ_API_BASE_URL?.trim() || 'https://api.groq.com/openai/v1').replace(/\/+$/, ''),
    model: process.env.GROQ_MODEL?.trim() || 'qwen/qwen3.8-27b',
    reasoningEffort: process.env.GROQ_REASONING_EFFORT?.trim() ?? '',
    maxCompletionTokens: readInt('GROQ_MAX_COMPLETION_TOKENS', 2048),
    temperature: readNumber('GROQ_TEMPERATURE', 0.6),
    systemPrompt: process.env.SYSTEM_PROMPT?.trim() || DEFAULT_SYSTEM_PROMPT,
    requestTimeoutMs: readInt('GROQ_TIMEOUT_MS', 60_000),
  },

  limits: {
    maxImageSizeBytes: readInt('MAX_IMAGE_SIZE_MB', 5) * 1024 * 1024,
    maxMessageLength: readInt('MAX_MESSAGE_LENGTH', 4000),
    /** Upper bound on how many messages of a conversation are replayed to Groq. */
    maxHistoryMessages: readInt('MAX_HISTORY_MESSAGES', 20),
    /** Upper bound on in-memory conversations before the oldest is evicted. */
    maxConversations: readInt('MAX_CONVERSATIONS', 500),
  },
} as const;

export const maxImageSizeMb = Math.round(config.limits.maxImageSizeBytes / (1024 * 1024));

export const isGroqConfigured = (): boolean => config.groq.apiKey.length > 0;
