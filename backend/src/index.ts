import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { config, isGroqConfigured, maxImageSizeMb } from './config.js';
import { HttpError } from './errors.js';
import { chatRouter } from './routes/chat.js';
import { conversationCount } from './services/history.js';

const app = express();

app.disable('x-powered-by');

// Only the configured frontend origins may call the API from a browser.
app.use(cors({ origin: config.allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

// Tiny request log: method, path, status, duration. Aborted requests show up
// too, which is handy when someone closes the tab mid-answer.
app.use((req, res, next) => {
  const startedAt = Date.now();
  let logged = false;

  const logRequest = () => {
    if (logged) return;
    logged = true;
    const outcome = res.writableFinished ? String(res.statusCode) : 'client-disconnected';
    console.log(`${req.method} ${req.originalUrl} -> ${outcome} (${Date.now() - startedAt}ms)`);
  };

  res.on('finish', logRequest);
  res.on('close', logRequest);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    model: config.groq.model,
    groqConfigured: isGroqConfigured(),
    activeConversations: conversationCount(),
    maxImageSizeMb,
  });
});

app.use('/api', chatRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

/** Translates upload failures into clear, user-facing messages. */
function describeMulterError(error: multer.MulterError): HttpError {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new HttpError(413, `The image is too large. Maximum size is ${maxImageSizeMb} MB.`);
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_UNEXPECTED_FILE':
      return new HttpError(400, 'Only one image can be attached per message.');
    case 'LIMIT_FIELD_VALUE':
    case 'LIMIT_FIELD_COUNT':
      return new HttpError(400, 'The request contained too much form data.');
    default:
      return new HttpError(400, 'The upload could not be processed.');
  }
}

// Single place where every error becomes an HTTP response. Internal details are
// logged server-side only; the client always gets a safe message.
app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    if (error.status >= 500) console.error('[server]', error.message);
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    const httpError = describeMulterError(error);
    res.status(httpError.status).json({ error: httpError.message });
    return;
  }

  if (typeof error === 'object' && error !== null && (error as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  console.error('[server] unexpected error:', error);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

app.listen(config.port, () => {
  console.log(`\nMultimodal chatbot backend listening on http://localhost:${config.port}`);
  console.log(`Model: ${config.groq.model}`);
  if (isGroqConfigured()) {
    console.log('Groq API key: loaded from environment');
  } else {
    console.warn('WARNING: GROQ_API_KEY is not set. Copy .env.example to .env and add your key.');
  }
});
