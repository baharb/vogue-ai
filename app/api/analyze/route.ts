import { NextRequest, NextResponse } from 'next/server'
import { HEADERS, guard, optionsResponse, cleanLang, cleanText, cleanProfile, profilePrompt, MAX_IMAGE_B64, geminiUrl, geminiHeaders } from '../../../lib/guard'

export async function OPTIONS() {
  return optionsResponse()
}

function extractJSON(raw: string): object {
  // Strip markdown fences
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  // Find outermost { }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1) throw new Error('No JSON object found')

  // Use full slice if we have closing brace, otherwise try to close it
  let slice = end > start ? text.slice(start, end + 1) : text.slice(start)

  // Fix 1: replace literal newlines/tabs inside the JSON string
  slice = slice.replace(/[\r\n\t]/g, ' ')

  // Fix 2: remove trailing commas
  slice = slice.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')

  // Try direct parse
  try { return JSON.parse(slice) } catch (_) {}

  // Fix 3: if still failing, try to auto-close truncated JSON
  // Count open braces/brackets and close them
  const opens = (slice.match(/{/g) || []).length - (slice.match(/}/g) || []).length
  const arrOpens = (slice.match(/\[/g) || []).length - (slice.match(/]/g) || []).length

  // If we have unclosed string (odd number of unescaped quotes after last comma)
  // truncate to last complete key:value pair
  let attempt = slice
  // Remove trailing incomplete value
  attempt = attempt.replace(/,?\s*"[^"]*$/, '')  // remove trailing incomplete key
  attempt = attempt.replace(/:\s*"[^"]*$/, '')    // remove trailing incomplete value
  attempt = attempt.replace(/,\s*$/, '')           // remove trailing comma

  const o2 = (attempt.match(/{/g) || []).length - (attempt.match(/}/g) || []).length
  const a2 = (attempt.match(/\[/g) || []).length - (attempt.match(/]/g) || []).length
  attempt = attempt + ']'.repeat(Math.max(0, a2)) + '}'.repeat(Math.max(0, o2))

  try { return JSON.parse(attempt) } catch (_) {}

  throw new Error('Could not parse Gemini JSON response')
}

// Ensure the result has all required fields with safe fallbacks
function sanitizeResult(r: Record<string, unknown>): Record<string, unknown> {
  return {
    overall_score:  typeof r.overall_score === 'number' ? r.overall_score : 7.0,
    headline:       typeof r.headline === 'string' && r.headline ? r.headline : 'Style analysis complete',
    stylist_note:   typeof r.stylist_note === 'string' ? r.stylist_note : '',
    style_archetype:typeof r.style_archetype === 'string' ? r.style_archetype : 'Contemporary',
    categories:     Array.isArray(r.categories) && r.categories.length > 0 ? r.categories : [
      { name: 'Overall', score: r.overall_score || 7.0, note: r.stylist_note || 'Analysis complete' }
    ],
    improvements:   Array.isArray(r.improvements) ? r.improvements : [],
    what_works:     Array.isArray(r.what_works) ? r.what_works : [],
    trend_tags:     Array.isArray(r.trend_tags) ? r.trend_tags : [],
    upgrade_tip:    typeof r.upgrade_tip === 'string' ? r.upgrade_tip : '',
    color_palette:  Array.isArray(r.color_palette) ? r.color_palette : [],
  }
}

export async function POST(request: NextRequest) {
  try {
    const blocked = await guard(request, 'analyze')
    if (blocked) return blocked

    const body = await request.json()
    const imageBase64 = body.imageBase64
    const occasion = cleanText(body.occasion, 40)
    const vibe = cleanText(body.vibe, 40)
    const gender = cleanText(body.gender, 20)
    const langInstruction = cleanLang(body.langInstruction)
    const profile = cleanProfile(body.profile)

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'No image provided' }, { status: 400, headers: HEADERS })
    }
    if (imageBase64.length > MAX_IMAGE_B64) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413, headers: HEADERS })
    }

    const prompt = `You are Trenxia — an elite AI fashion stylist. Analyze this outfit image.

Context: Occasion="${occasion || 'Casual'}", Style="${vibe || 'any'}", Gender="${gender || 'any'}"
${profilePrompt(profile)}
${langInstruction ? `Language: ${langInstruction}` : 'Respond in English.'}

Return ONLY a raw JSON object. No markdown. No backticks. No text before or after. Start with { and end with }.
All string values must be on a single line (no newlines inside strings).

{
  "overall_score": 7.4,
  "headline": "one sentence about this look",
  "stylist_note": "2-3 sentences honest warm feedback",
  "style_archetype": "label like Off-Duty Model",
  "categories": [
    {"name":"Color Harmony","score":8.2,"note":"observation"},
    {"name":"Fit & Proportions","score":7.0,"note":"observation"},
    {"name":"Occasion Match","score":8.5,"note":"observation"},
    {"name":"Trend Awareness","score":6.8,"note":"observation"},
    {"name":"Accessories","score":7.2,"note":"observation"},
    {"name":"Fabric & Texture","score":7.5,"note":"observation"},
    {"name":"Overall Vibe","score":7.8,"note":"observation"}
  ],
  "improvements": [
    {"priority":"high","item":"item","action":"fix"},
    {"priority":"medium","item":"item","action":"fix"},
    {"priority":"low","item":"item","action":"fix"}
  ],
  "what_works": ["strength 1","strength 2","strength 3"],
  "trend_tags": ["#tag1","#tag2","#tag3"],
  "upgrade_tip": "one power move",
  "color_palette": ["#hex1","#hex2","#hex3"]
}`

    const geminiRes = await fetch(
      geminiUrl(),
      {
        method: 'POST',
        headers: geminiHeaders(),
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
            thinkingConfig: { thinkingBudget: 0 },
          }
        })
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      console.error('Gemini analyze error:', geminiRes.status, JSON.stringify(err))
      if (geminiRes.status === 429) {
        return NextResponse.json({ error: '__errServer' }, { status: 429, headers: HEADERS })
      }
      return NextResponse.json({ error: '__errServer' }, { status: 500, headers: HEADERS })
    }

    const geminiData = await geminiRes.json()
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const finishReason = geminiData.candidates?.[0]?.finishReason

    console.log('Analyze finish reason:', finishReason, 'Text length:', text.length)

    if (!text) {
      return NextResponse.json({ error: 'Empty response from AI. Please try again.' }, { status: 500, headers: HEADERS })
    }

    let parsed: Record<string, unknown>
    try {
      parsed = extractJSON(text) as Record<string, unknown>
    } catch (parseErr) {
      console.error('JSON parse failed. Raw:', text.slice(0, 800))
      return NextResponse.json({ error: 'Could not read AI response. Please try again.' }, { status: 500, headers: HEADERS })
    }

    const result = sanitizeResult(parsed)

    return NextResponse.json({ result }, { headers: HEADERS })

  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers: HEADERS })
  }
}
