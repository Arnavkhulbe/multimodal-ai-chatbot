# Multimodal AI Chatbot (Groq)

A ChatGPT-style chatbot that understands **text and images**. Type a question, attach a screenshot,
chart or photo, and the answer comes back from a Groq vision model.

Built as a small, readable prototype: React + TypeScript + Tailwind on the front end, Express +
TypeScript on the back end, the Groq API for the model, and conversation history kept in server
memory. No database, no auth, no vector store — those can come later.

---

## 1. Features

- Clean, responsive chat UI (user and assistant bubbles, auto-scroll, empty-state prompt chips)
- Text-only messages, image-only messages, or text **+** image in one message
- Image preview before sending, and the image is shown inside the sent message
- Drag & drop, paste-from-clipboard, or the paperclip button to attach an image
- "AI is thinking" loading state and a spinner on the send button
- Clear error banner for failed requests, plus inline validation messages
- Clear chat button (resets the conversation on both the client and the server)
- Upload validation: PNG / JPEG / WebP only, 5 MB max (both client and server side)
- The Groq API key stays on the server; it is never sent to the browser
- Conversation history: the model remembers earlier turns, including earlier images

---

## 2. Architecture

```
┌──────────────────────────────┐        ┌───────────────────────────────────┐        ┌──────────────┐
│  Frontend (Vite :5173)       │        │  Backend (Express :3001)          │        │  Groq API    │
│                              │        │                                   │        │              │
│  React + TS + Tailwind       │  /api  │  1. validate upload (multer)      │ HTTPS  │  /openai/v1/ │
│  - transcript + composer     │ ─────► │  2. base64 data URL               │ ─────► │  chat/       │
│  - image preview             │        │  3. append to history             │        │  completions │
│  - loading / error state     │ ◄───── │  4. call Groq (key from .env)     │ ◄───── │              │
│                              │  JSON  │  5. append assistant reply        │        │  vision      │
└──────────────────────────────┘        └───────────────────────────────────┘        └──────────────┘
         never sees the API key                 holds GROQ_API_KEY + history
```

### How the data flows

**Text only**

1. The browser posts `multipart/form-data` to `/api/chat` with `message`, `sessionId` and no file.
2. The backend pushes `{ role: "user", content: "What is machine learning?" }` onto that session's history.
3. It sends `[systemPrompt, ...history]` to Groq's `chat/completions` endpoint.
4. The reply text is appended to the history as `{ role: "assistant", ... }` and returned as JSON.
5. The frontend appends the reply to the transcript.

**Text + image**

1. The browser attaches the file to the same POST (`image` field). A local `blob:` URL shows the preview.
2. The backend validates MIME type and size, then encodes the bytes as a data URL:
   `data:image/png;base64,iVBORw0KGgo…`
3. The user turn becomes an array of content parts instead of a string:

   ```json
   {
     "role": "user",
     "content": [
       { "type": "text", "text": "What error is shown in this screenshot?" },
       { "type": "image_url", "image_url": { "url": "data:image/png;base64,…" } }
     ]
   }
   ```

4. That message is appended to the history and the whole history is sent to Groq (so follow-up
   questions about the same image work).
5. Step 4 of the text flow then applies: the assistant reply is stored and returned.

**Conversation history**

```
user message ──► history (per sessionId) ──► [system, ...history] ──► Groq ──► assistant reply ──► history
```

`backend/src/services/history.ts` keeps a `Map<sessionId, messages[]>` in server memory. The browser
only stores a random `sessionId` (in `localStorage`) and sends it with every request. Restarting the
server clears the conversations — that is the trade-off of a prototype with no database.

---

## 3. Project structure

```
multimodal-chatbot/
├── backend/                      Express + TypeScript API
│   ├── src/
│   │   ├── index.ts              app wiring: CORS, logging, health, error handler, listen()
│   │   ├── config.ts             all env vars in one place
│   │   ├── errors.ts             HttpError (user-safe messages)
│   │   ├── middleware/upload.ts  multer: memory storage, type + size checks
│   │   ├── routes/chat.ts        POST /api/chat, POST /api/chat/reset, GET /api/chat/history
│   │   └── services/
│   │       ├── groq.ts           Groq client + error mapping
│   │       └── history.ts        in-memory conversation store
│   ├── package.json
│   └── tsconfig.json
├── frontend/                     React + TypeScript + Tailwind (Vite)
│   ├── src/
│   │   ├── App.tsx               layout: header, transcript, composer
│   │   ├── components/           Header, MessageList, MessageBubble, TypingIndicator,
│   │   │                         ChatInput, ErrorBanner
│   │   ├── hooks/useChat.ts      transcript + send/clear/error state
│   │   ├── hooks/useHealth.ts    reads model name / key status from /api/health
│   │   ├── api/chat.ts           all HTTP calls to the backend
│   │   ├── lib/                  constants (upload rules, examples) + session id
│   │   └── index.css             Tailwind entry
│   └── vite.config.ts            Tailwind plugin + /api proxy → :3001
├── tools/mock-groq-server.mjs    optional: fake Groq API for keyless local testing
├── .env.example                  copy to .env
├── .gitignore
└── README.md
```

---

## 4. Installation

Requires **Node.js 20.11+** (developed on Node 24) and npm.

```bash
# from the project root
cd backend  && npm install
cd ../frontend && npm install
```

## 5. Environment setup

```bash
# from the project root
cp .env.example .env
```

Then open `.env` and set your key (get a free one at <https://console.groq.com/keys>):

```env
GROQ_API_KEY=your_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b
```

`.env` is git-ignored — **never commit it**. The backend loads `backend/.env` first and then the root
`.env`, so either location works; real environment variables win over both. The model name lives in
`GROQ_MODEL`, so switching to a newer vision model is a one-line change.

## 6. Running the app

Two terminals:

```bash
# terminal 1 — backend on http://localhost:3001
cd backend
npm run dev

# terminal 2 — frontend on http://localhost:5173
cd frontend
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api/*` to the backend, so there is no CORS setup or API
URL to configure in the browser. Production builds: `npm run build` in each folder
(`npm start` in `backend/`, `npm run preview` in `frontend/`).

## 7. How to test

### Text-only

1. Type `What is machine learning?` and press **Enter** (or click **Send**).
2. The message appears on the right, a typing indicator appears, then the answer on the left.
3. Ask a follow-up such as `Give me a one-line example.` — the answer should build on the previous
   turn, which proves the history is being replayed.

### Image + text

1. Click the paperclip (or drag & drop / paste a screenshot). A thumbnail appears above the input
   with an ✕ button to remove it.
2. Type a question, e.g. `What error is shown in this screenshot?`, and send.
3. The image is rendered inside your message, and the answer comes back about that image.
4. Ask a follow-up like `What line number is mentioned?` — the model still has the image in context.
5. Try attaching an image with no text at all: the backend asks the model to describe it.

### Error and limit cases (all of these are handled)

| What you do | What you should see |
| --- | --- |
| Send with an empty input and no image | Send button stays disabled |
| Attach a `.txt` / `.pdf` | "Unsupported file type. Please attach a PNG, JPEG or WebP image." (client-side) |
| Attach an image larger than 5 MB | Client message *or* `413 The image is too large…` from the server |
| Message longer than 4000 characters | `400 Your message is too long…` |
| Invalid/expired Groq key | Red banner: "The server could not authenticate with the AI provider…" |
| Groq rate limit | Red banner: "The AI provider is rate limiting requests right now…" |
| Backend not running | Red banner: "Could not reach the server. Is the backend running on port 3001?" |
| Close the tab mid-answer | The server aborts the Groq request (logged as `client-disconnected`) |

### Quick API smoke test

```bash
# health + configured model
curl http://localhost:3001/api/health

# text only
curl -X POST http://localhost:3001/api/chat \
  -F 'sessionId=smoke-test-1234' -F 'message=What is machine learning?'

# text + image
curl -X POST http://localhost:3001/api/chat \
  -F 'sessionId=smoke-test-1234' -F 'message=What is in this image?' \
  -F 'image=@./screenshot.png;type=image/png'

# inspect what the backend remembers (base64 images are redacted, hasImage shows them)
curl 'http://localhost:3001/api/chat/history?sessionId=smoke-test-1234'

# forget the conversation
curl -X POST http://localhost:3001/api/chat/reset \
  -H 'Content-Type: application/json' -d '{"sessionId":"smoke-test-1234"}'
```

### Optional: run everything without a Groq key

`tools/mock-groq-server.mjs` is a tiny fake Groq API that echoes what it received, so you can test the
UI and the whole request path offline:

```bash
node tools/mock-groq-server.mjs                    # terminal 1 (port 4111)

# terminal 2
cd backend
GROQ_API_KEY=anything GROQ_API_BASE_URL=http://127.0.0.1:4111/v1 npm run dev

# terminal 3
cd frontend && npm run dev
```

Send `#trigger:429`, `#trigger:401`, `#trigger:500` or `#trigger:slow` as a message to exercise the
error and abort paths.

---

## 8. API reference

### `POST /api/chat`

`multipart/form-data`

| Field | Required | Notes |
| --- | --- | --- |
| `message` | no* | Up to `MAX_MESSAGE_LENGTH` characters (default 4000) |
| `image` | no* | PNG / JPEG / WebP, up to `MAX_IMAGE_SIZE_MB` (default 5 MB) |
| `sessionId` | no | 8–64 chars `[A-Za-z0-9_-]`; defaults to `default-session` |

\* at least one of `message` or `image` is required.

`200`:

```json
{ "reply": "…", "sessionId": "…", "model": "qwen/qwen3.8-27b", "hadImage": true, "turnCount": 4 }
```

`400` bad request · `413` image too large · `415` unsupported type · `422` provider rejected the
message/image · `429` provider rate limit · `502`/`503`/`504` provider or configuration problems.

Errors always use the shape `{ "error": "human readable message" }` — provider responses and stack
traces stay in the server log.

### Other endpoints

- `POST /api/chat/reset` — body `{ "sessionId": "…" }`, drops the stored conversation.
- `GET /api/chat/history?sessionId=…` — debugging view of what the server remembers (images redacted).
- `GET /api/health` — model, whether `GROQ_API_KEY` is set, active conversation count, size limit.

## 9. Important files

| File | Why it matters |
| --- | --- |
| [backend/src/routes/chat.ts](backend/src/routes/chat.ts) | The heart of the API: validates input, builds the multimodal content parts, calls Groq, stores both turns. |
| [backend/src/services/groq.ts](backend/src/services/groq.ts) | Talks to Groq and maps provider failures onto safe, friendly HTTP errors. |
| [backend/src/services/history.ts](backend/src/services/history.ts) | The in-memory conversation store (swap for Redis/Postgres later). |
| [backend/src/middleware/upload.ts](backend/src/middleware/upload.ts) | Where uploads are accepted or rejected (multer, memory storage). |
| [backend/src/config.ts](backend/src/config.ts) | Every environment variable, with defaults, in one readable place. |
| [frontend/src/hooks/useChat.ts](frontend/src/hooks/useChat.ts) | Client-side conversation state: transcript, sending, errors, clear. |
| [frontend/src/components/ChatInput.tsx](frontend/src/components/ChatInput.tsx) | Composer: attach/drag/paste, preview, client-side validation, Enter-to-send. |
| [frontend/src/api/chat.ts](frontend/src/api/chat.ts) | The only place the frontend talks to the backend. |
| [frontend/vite.config.ts](frontend/vite.config.ts) | Tailwind plugin and the `/api` proxy that replaces `localhost:5173` with `:3001`. |

## 10. Security notes

- `GROQ_API_KEY` is read from the environment on the server and is never returned by any endpoint or
  included in the frontend bundle (the browser only ever calls `/api/*`).
- `.env` is in `.gitignore`; only `.env.example` (empty) is committed.
- Uploads are validated on MIME type **and** size, kept in memory, and never written to disk.
- Request bodies are validated (`message` length, `sessionId` shape) before any provider call.
- Provider errors are logged in full on the server but replaced with generic, user-safe messages
  before reaching the browser. The server keeps no stack traces in responses.
- CORS is restricted to the origins in `ALLOWED_ORIGINS` (default `http://localhost:5173`).

## 11. Known limitations / next steps

- History is per-process and in-memory: restarting the backend (or running multiple instances) loses
  it. Redis or Postgres is the natural next step.
- Only the newest `MAX_HISTORY_MESSAGES` messages are replayed; images count as ~2048 input tokens each.
- Responses are not streamed (the UI shows a typing indicator instead) and there is no retry button.
- No rate limiting, auth, or per-user quota yet — fine for local use, needed before public hosting.
- `qwen/qwen3.8-27b` accepts at most 3 images per request; the UI currently sends one.
