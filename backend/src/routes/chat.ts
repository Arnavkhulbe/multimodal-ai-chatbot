import { Router, type Request, type Response } from 'express';
import { config } from '../config.js';
import { HttpError } from '../errors.js';
import { uploadImage } from '../middleware/upload.js';
import { createChatCompletion, type ContentPart, type ConversationMessage } from '../services/groq.js';
import { appendToHistory, clearHistory, getHistory } from '../services/history.js';

/**
 * Chat routes.
 *
 * POST /api/chat        multipart/form-data: message (text), image (optional file), sessionId
 * POST /api/chat/reset  JSON: { sessionId }            -> forgets the conversation
 * GET  /api/chat/history?sessionId=...                 -> debug view (images redacted)
 */

export const chatRouter = Router();

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** Keeps session ids to a safe character set so they can key the in-memory store. */
function normalizeSessionId(value: unknown): string {
  return typeof value === 'string' && SESSION_ID_PATTERN.test(value) ? value : 'default-session';
}

function toDataUrl(file: Express.Multer.File): string {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

/** Aborts the upstream Groq call if the browser goes away mid-request. */
function clientAbortSignal(req: Request, res: Response): AbortSignal {
  const controller = new AbortController();
  req.on('aborted', () => controller.abort());
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });
  return controller.signal;
}

chatRouter.post('/chat', uploadImage, async (req: Request, res: Response) => {
  const sessionId = normalizeSessionId(req.body?.sessionId);
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const image = req.file;

  if (message.length > config.limits.maxMessageLength) {
    throw new HttpError(400, `Your message is too long (limit is ${config.limits.maxMessageLength} characters).`);
  }
  if (!message && !image) {
    throw new HttpError(400, 'Please provide a message, an image, or both.');
  }

  // Build the multimodal content: text first, then the optional image.
  const content: ContentPart[] = [];
  if (message) {
    content.push({ type: 'text', text: message });
  }
  if (image) {
    content.push({ type: 'image_url', image_url: { url: toDataUrl(image) } });
  }
  if (image && !message) {
    // An image with no words still needs a question for the model to answer.
    content.unshift({ type: 'text', text: 'Describe this image in detail.' });
  }

  appendToHistory(sessionId, { role: 'user', content });

  // The system prompt is prepended fresh on every request; history holds only
  // the actual conversation.
  const messages: ConversationMessage[] = [
    { role: 'system', content: config.groq.systemPrompt },
    ...getHistory(sessionId),
  ];

  const reply = await createChatCompletion(messages, clientAbortSignal(req, res));
  appendToHistory(sessionId, { role: 'assistant', content: reply });

  res.json({
    reply,
    sessionId,
    model: config.groq.model,
    hadImage: Boolean(image),
    turnCount: getHistory(sessionId).length,
  });
});

chatRouter.post('/chat/reset', (req: Request, res: Response) => {
  const sessionId = normalizeSessionId(req.body?.sessionId);
  clearHistory(sessionId);
  res.json({ ok: true, sessionId });
});

chatRouter.get('/chat/history', (req: Request, res: Response) => {
  const sessionId = normalizeSessionId(req.query.sessionId);
  const history = getHistory(sessionId).map((entry) => ({
    role: entry.role,
    // Redact base64 image payloads; they are megabytes of noise in a JSON view.
    text: typeof entry.content === 'string'
      ? entry.content
      : entry.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n'),
    hasImage: Array.isArray(entry.content) && entry.content.some((part) => part.type === 'image_url'),
  }));

  res.json({ sessionId, messageCount: history.length, messages: history });
});
