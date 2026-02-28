import { NextRequest, NextResponse } from 'next/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// Robustly extract JSON from Gemini response which may include markdown fences,
// extra text before/after, or be truncated mid-string by token limit.
function extractJSON(raw: string): object {
  // Strip markdown fences
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  // Find outermost { }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1) throw new Error('No JSON object found in response')

  // If no closing brace (truncated), close it manually
  const slice = end !== -1 ? text.slice(start, end + 1) : text.slice(start)

  // Try clean parse first
  try {
    return JSON.parse(slice)
  } catch (_) {}

  // Gemini 2.5 sometimes returns unescaped newlines inside string values.
  // Replace literal newlines inside strings with \n escape.
  const fixed = slice
    .replace(/[\r\n]+/g, ' ')   // flatten real newlines
    .replace(/\t/g, ' ')         // flatten tabs
    .replace(/,\s*}/g, '}')      // trailing commas before }
    .replace(/,\s*]/g, ']')      // trailing commas before ]

  try {
    return JSON.parse(fixed)
  } catch (_) {}

  // Last resort: try to parse up to the last complete field by trimming
  // from the end until we get valid JSON
  let attempt = fixed
  while (attempt.length > 10) {
    attempt = attempt.slice(0, attempt.lastIndexOf(','))
    // Close all open arrays and object
    const opens = (attempt.match(/{/g) || []).length - (attempt.match(/}/g) || []).length
    const arrOpens = (attempt.match(/\[/g) || []).length - (attempt.match(/]/g) || []).length
    const closed = attempt + ']'.repeat(Math.max(0, arrOpens)) + '}'.repeat(Math.max(0, opens))
    try {
      return JSON.parse(closed)
    } catch (_) {}
  }

  throw new Error('Could not parse Gemini JSON response')
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, occasion, vibe, gender, langInstruction } = await request.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400, headers: CORS })
    }

    const prompt = `You are Trenxia — an elite AI fashion stylist with the sharp eye of a Vogue editor, the warmth of a personal stylist, and the honesty of a best friend. Analyze this outfit image with extreme specificity — reference the actual items you see in the photo.

Context: Occasion="${occasion || 'Casual'}", Style="${vibe || 'any'}", Gender="${gender || 'any'}"
${langInstruction ? `Language instruction: ${langInstruction}` : 'Respond in English.'}

IMPORTANT: Respond ONLY with a single valid JSON object. No markdown, no backticks, no extra text before or after. All string values must use only regular ASCII double quotes. Do not use smart quotes or special characters in keys.

{
  "overall_score": 7.4,
  "headline": "One sharp punchy sentence about this look",
  "stylist_note": "2-3 sentences about the outfit",
  "style_archetype": "e.g. Off-Duty Model",
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
    {"priority":"high","item":"item name","action":"fix description"},
    {"priority":"medium","item":"item name","action":"fix description"},
    {"priority":"low","item":"item name","action":"fix description"}
  ],
  "what_works": ["strength 1","strength 2","strength 3"],
  "trend_tags": ["#tag1","#tag2","#tag3"],
  "upgrade_tip": "one power move tip",
  "color_palette": ["#hex1","#hex2","#hex3"]
}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
            { text: prompt }
          ]}],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
            responseMimeType: 'application/json',  // Force Gemini to return JSON
          }
        })
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      console.error('Gemini analyze error:', err)
      return NextResponse.json({ error: 'AI analysis failed. Please try again.' }, { status: 500, headers: CORS })
    }

    const geminiData = await geminiRes.json()
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!text) {
      console.error('Empty Gemini response:', JSON.stringify(geminiData))
      return NextResponse.json({ error: 'Empty response from AI. Please try again.' }, { status: 500, headers: CORS })
    }

    let result: object
    try {
      result = extractJSON(text)
    } catch (parseErr) {
      console.error('JSON parse failed. Raw text:', text.slice(0, 500))
      return NextResponse.json({ error: 'Could not read AI response. Please try again.' }, { status: 500, headers: CORS })
    }

    return NextResponse.json({ result }, { headers: CORS })

  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers: CORS })
  }
}
