/**
 * Tiny stand-in for the Groq API, for local testing without a real key.
 *
 *   node tools/mock-groq-server.mjs            # listens on http://localhost:4111
 *   GROQ_API_BASE_URL=http://localhost:4111/v1 npm run dev   # (inside backend/)
 *
 * It validates the incoming chat-completions payload, prints a one-line summary
 * of every request (model, message roles, whether an image was attached) and
 * answers with a canned reply. It is a development helper only — delete it if
 * you do not want it around.
 *
 * Send one of these in the message text to exercise the error paths:
 *   #trigger:401  #trigger:429  #trigger:500  #trigger:slow
 */
import http from 'node:http'

const PORT = Number(process.env.MOCK_PORT ?? 4111)
const PATH = '/v1/chat/completions'

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/v1/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ object: 'list', data: [{ id: 'mock-vision-model', object: 'model' }] }))
    return
  }

  if (req.method !== 'POST' || req.url !== PATH) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: { message: 'not found' } }))
    return
  }

  let raw = ''
  req.on('data', (chunk) => {
    raw += chunk
  })
  req.on('end', () => {
    let payload
    try {
      payload = JSON.parse(raw)
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'invalid JSON' } }))
      return
    }

    const messages = Array.isArray(payload.messages) ? payload.messages : []
    const last = messages[messages.length - 1]
    const parts = Array.isArray(last?.content) ? last.content : []
    const imagePart = parts.find((part) => part.type === 'image_url')
    const textPart = parts.find((part) => part.type === 'text')
    const dataUrl = imagePart?.image_url?.url ?? ''
    const base64Bytes = dataUrl.includes('base64,') ? Math.round((dataUrl.split('base64,')[1].length * 3) / 4) : 0

    const system = messages.find((message) => message.role === 'system')
    console.log(
      `[mock-groq] model=${payload.model} messages=${messages.length} ` +
        `roles=${messages.map((message) => message.role).join('>')} ` +
        `system="${String(system?.content ?? '(none)').slice(0, 45)}…" ` +
        `image=${imagePart ? `${dataUrl.slice(0, 22)}… ${base64Bytes} bytes` : 'none'} ` +
        `text="${String(textPart?.text ?? '').slice(0, 60)}"`,
    )

    const triggers = { '#trigger:401': 401, '#trigger:429': 429, '#trigger:500': 500 }
    const triggerStatus = Object.keys(triggers).find((key) => String(textPart?.text ?? '').includes(key))
    if (triggerStatus) {
      console.log(`[mock-groq] replying with ${triggers[triggerStatus]} for ${triggerStatus}`)
      res.writeHead(triggers[triggerStatus], { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: `mock upstream error for ${triggerStatus}`, type: 'mock_error' } }))
      return
    }

    if (String(textPart?.text ?? '').includes('#trigger:slow')) {
      console.log('[mock-groq] delaying reply for 5s (#trigger:slow)')
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            choices: [{ index: 0, message: { role: 'assistant', content: 'slow mock reply' }, finish_reason: 'stop' }],
          }),
        )
      }, 5000)
      return
    }

    const reply = imagePart
      ? `MOCK-VISION reply: I received ${messages.length} message(s) and an image of ${base64Bytes} bytes. ` +
        `Your question was: "${textPart?.text ?? '(none)'}".`
      : `MOCK-TEXT reply: I received ${messages.length} message(s) with no image. ` +
        `Your question was: "${textPart?.text ?? '(none)'}".`

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        id: 'chatcmpl-mock',
        object: 'chat.completion',
        model: payload.model,
        choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
    )
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-groq] listening on http://127.0.0.1:${PORT}/v1`)
})
