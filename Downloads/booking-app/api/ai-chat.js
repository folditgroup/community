// Vercel serverless function. Receives chat history + booking context and
// returns a conversational reply plus an optional structured proposal AND/OR lead capture.
// Calls the Anthropic Messages API. The API key stays on the server.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
const ENDPOINT = 'https://api.anthropic.com/v1/messages'

const SYSTEM = `You are the booking assistant for a small field service business. You speak warmly and briefly.

Your job has two paths:

PATH A — instant booking:
If the customer can pick from availableSlots provided in the user context, guide them to a specific slot and end with:
  <proposal>{"serviceId":"<id>","slotISO":"<one of availableSlots>","notes":"short scope summary"}</proposal>

PATH B — capture lead for callback:
If no slot fits, or customer wants to discuss further, OR availableSlots is empty/limited — politely ask for their NAME and PHONE NUMBER so the team can call them back. After they give name + phone, confirm warmly and end with:
  <lead>{"name":"<name>","phone":"<phone>","serviceId":"<best match>","message":"<short summary of what they need>","preferredTime":"<ISO or null>"}</lead>

Rules:
- Keep replies under 3 sentences.
- If customer is vague, ask ONE focused follow-up.
- Only propose a slotISO that appears verbatim in availableSlots.
- For the <lead> tag: only emit it AFTER you have BOTH name AND phone number from the customer.
- Be warm. Sound like a human, not a form.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(200).json({
      reply: "(AI is not configured — set ANTHROPIC_API_KEY in your environment.) You can still use Quick book to pick a service and time.",
    })
  }
  try {
    const { messages = [], context = {} } = req.body || {}
    const userContextPreamble = {
      role: 'user',
      content: `Booking context (JSON):\n${JSON.stringify(context, null, 2)}\n\nIf you have enough information, either propose a slot or capture a lead.`,
    }
    const chat = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM,
        messages: [userContextPreamble, ...chat],
      }),
    })
    if (!r.ok) {
      const err = await r.text()
      return res.status(500).json({ error: 'AI request failed', detail: err })
    }
    const data = await r.json()
    const text = data.content?.[0]?.text || ''
    const parsed = extractTags(text)
    return res.status(200).json(parsed)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

function extractTags(text) {
  let reply = text
  let proposal = null
  let lead = null

  const proposalMatch = text.match(/<proposal>([\s\S]*?)<\/proposal>/)
  if (proposalMatch) {
    reply = reply.replace(proposalMatch[0], '').trim()
    try { proposal = JSON.parse(proposalMatch[1].trim()) } catch {}
  }

  const leadMatch = text.match(/<lead>([\s\S]*?)<\/lead>/)
  if (leadMatch) {
    reply = reply.replace(leadMatch[0], '').trim()
    try { lead = JSON.parse(leadMatch[1].trim()) } catch {}
  }

  return { reply: reply.trim(), proposal, lead }
}
