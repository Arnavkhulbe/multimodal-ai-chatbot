import { config, isGroqConfigured } from '../config.js';
import { HttpError } from '../errors.js';

/**
 * Thin client for Groq's OpenAI-compatible chat completions endpoint.
 *
 * Text turns are sent as a plain string, image turns as an array of content
 * parts (`text` + `image_url`). That is exactly the shape the Groq vision API
 * expects, so history can be replayed verbatim on every request.
 */

export type MessageRole = 'system' | 'user' | 'assistant';

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ConversationMessage {
  role: MessageRole;
  content: string | ContentPart[];
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
}

/** Maps a provider failure onto a user-friendly status + message. */
function describeUpstreamError(status: number): HttpError {
  if (status === 401 || status === 403) {
    return new HttpError(502, 'The server could not authenticate with the AI provider. Check the server configuration.');
  }
  if (status === 429) {
    return new HttpError(429, 'The AI provider is rate limiting requests right now. Please wait a moment and try again.');
  }
  if (status === 400 || status === 422) {
    return new HttpError(422, 'The AI provider rejected this request. Try a different image or a shorter message.');
  }
  if (status >= 500) {
    return new HttpError(502, 'The AI provider is unavailable right now. Please try again shortly.');
  }
  return new HttpError(502, 'The AI provider returned an unexpected error. Please try again.');
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

/**
 * Sends the conversation to Groq and returns the assistant's reply text.
 * `signal` is aborted when the browser disconnects, so we stop waiting (and
 * stop paying for) a response nobody will read.
 */
export async function createChatCompletion(
  messages: ConversationMessage[],
  signal?: AbortSignal,
): Promise<string> {
  if (!isGroqConfigured()) {
    throw new HttpError(503, 'The chatbot is not configured yet: GROQ_API_KEY is missing on the server. See README.md.');
  }

  const payload: Record<string, unknown> = {
    model: config.groq.model,
    messages,
    temperature: config.groq.temperature,
    max_completion_tokens: config.groq.maxCompletionTokens,
    stream: false,
  };
  if (config.groq.reasoningEffort) {
    payload.reasoning_effort = config.groq.reasoningEffort;
  }

  const timeoutSignal = AbortSignal.timeout(config.groq.requestTimeoutMs);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(`${config.groq.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groq.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: combinedSignal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw new HttpError(499, 'The request was cancelled.');
    }
    console.error('[groq] request failed:', error);
    if (isAbortError(error)) {
      throw new HttpError(504, 'The AI provider took too long to respond. Please try again.');
    }
    throw new HttpError(502, 'Could not reach the AI provider. Check the server network connection.');
  }

  if (!response.ok) {
    // Log the provider response for operators, but never forward it verbatim.
    const details = await response.text().catch(() => '');
    console.error(`[groq] ${response.status} ${response.statusText}: ${details.slice(0, 2000)}`);
    throw describeUpstreamError(response.status);
  }

  const data = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    console.error('[groq] unexpected response payload:', JSON.stringify(data)?.slice(0, 2000));
    throw new HttpError(502, 'The AI provider returned an empty response. Please try again.');
  }

  return reply;
}
