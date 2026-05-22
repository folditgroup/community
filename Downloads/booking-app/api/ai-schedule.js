// AI dispatcher: given the day's bookings and crew, return a suggested
// reordering + worker assignments. Used by the dashboard's "Optimize today"
// action.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
const ENDPOINT = 'https://api.anthropic.com/v1/messages'

const SYSTEM = `You are a field-service dispatcher. Given today's bookings, workers, and constraints, return a JSON-only response of the shape:
{
  "ordering": ["<bookingId>", ...],
  "assignments": { "<bookingId>": ["<workerId>", ...] },
  "rationale": "one short sentence"
}
Optimize for:
1. Geographic clustering (minimize driving).
2. Worker skill fit.
3. Balanced crew workload.
Return ONLY the JSON. No prose.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(200).json({ ordering: null, assignments: null, rationale: 'AI disabled — set ANTHROPIC_API_KEY to enable.' })
  }
  try {
    const { bookings = [], workers = [] } = req.body || {}
    const payload = { bookings, workers }
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: 'user', content: `Schedule input (JSON):\n${JSON.stringify(payload)}` }],
      }),
    })
    if (!r.ok) return res.status(500).json({ error: await r.text() })
    const data = await r.json()
    const text = data.content?.[0]?.text || '{}'
    try {
      return res.status(200).json(JSON.parse(text))
    } catch {
      return res.status(200).json({ rationale: text })
    }
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
