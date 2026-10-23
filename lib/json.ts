// Pull a JSON object out of a Gemini text reply, repairing the usual problems
// (markdown fences, raw newlines, trailing commas, a truncated tail).
export function extractJSON(raw: string): object {
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1) throw new Error('No JSON object found')

  let slice = end > start ? text.slice(start, end + 1) : text.slice(start)
  slice = slice.replace(/[\r\n\t]/g, ' ')
  slice = slice.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')

  try { return JSON.parse(slice) } catch (_) {}

  // Truncated reply: drop the incomplete tail and close open brackets
  let attempt = slice
  attempt = attempt.replace(/,?\s*"[^"]*$/, '')
  attempt = attempt.replace(/:\s*"[^"]*$/, '')
  attempt = attempt.replace(/,\s*$/, '')
  const o2 = (attempt.match(/{/g) || []).length - (attempt.match(/}/g) || []).length
  const a2 = (attempt.match(/\[/g) || []).length - (attempt.match(/]/g) || []).length
  attempt = attempt + ']'.repeat(Math.max(0, a2)) + '}'.repeat(Math.max(0, o2))

  try { return JSON.parse(attempt) } catch (_) {}

  throw new Error('Could not parse Gemini JSON response')
}
