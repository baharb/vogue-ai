import { NextRequest, NextResponse } from 'next/server'
import { HEADERS, guard, optionsResponse, cleanLang, cleanText, MAX_IMAGE_B64, geminiUrl, geminiHeaders } from '../../../lib/guard'
import { extractJSON } from '../../../lib/json'

// ─── BODY & COLOUR SCAN ───────────────────────────────────────────────────────
// The user sends one full-length mirror photo. We return their body shape and
// personal colouring (skin undertone, contrast, colour season) plus what to wear.
// The photo is only forwarded to Gemini for this one call; nothing is stored.

export async function OPTIONS() {
  return optionsResponse()
}

const SHAPES = {
  women: ['hourglass', 'pear', 'apple', 'rectangle', 'inverted_triangle'],
  men: ['trapezoid', 'inverted_triangle', 'rectangle', 'triangle', 'oval'],
}
const ISSUES = ['no_person', 'not_full_body', 'multiple_people', 'too_dark', 'blurry']
const UNDERTONES = ['warm', 'cool', 'neutral', 'olive']
const CONTRASTS = ['low', 'medium', 'high']
const CONFIDENCE = ['high', 'medium', 'low']

const HEX = /^#[0-9A-Fa-f]{6}$/

function str(v: unknown, max = 300): string {
  return typeof v === 'string' ? v.slice(0, max).trim() : ''
}
function list(v: unknown, n = 6, max = 120): string[] {
  return Array.isArray(v) ? v.map(x => str(x, max)).filter(Boolean).slice(0, n) : []
}
function oneOf(v: unknown, allowed: string[], fallback: string): string {
  const s = str(v, 40).toLowerCase()
  return allowed.includes(s) ? s : fallback
}
function swatches(v: unknown, n: number): { name: string; hex: string }[] {
  if (!Array.isArray(v)) return []
  return v
    .map(x => ({ name: str((x as any)?.name, 40), hex: str((x as any)?.hex, 7).toUpperCase() }))
    .filter(x => x.name && HEX.test(x.hex))
    .slice(0, n)
}

function sanitize(r: Record<string, any>, shapes: string[]) {
  const issue = oneOf(r.issue, ISSUES, '')
  if (r.ok === false || issue) {
    return { ok: false, issue: issue || 'not_full_body', message: str(r.message) }
  }
  const b = r.body || {}
  const c = r.color || {}
  return {
    ok: true,
    body: {
      shape: oneOf(b.shape, shapes, shapes.includes('rectangle') ? 'rectangle' : shapes[0]),
      shape_label: str(b.shape_label, 40),
      summary: str(b.summary, 400),
      highlights: list(b.highlights, 4),
      flatter: list(b.flatter, 6),
      avoid: list(b.avoid, 4),
      necklines: list(b.necklines, 4, 60),
      best_pieces: list(b.best_pieces, 6),
    },
    color: {
      undertone: oneOf(c.undertone, UNDERTONES, 'neutral'),
      contrast: oneOf(c.contrast, CONTRASTS, 'medium'),
      season: str(c.season, 40),
      summary: str(c.summary, 400),
      metals: str(c.metals, 40),
      best_colors: swatches(c.best_colors, 8),
      neutrals: swatches(c.neutrals, 4),
      avoid_colors: swatches(c.avoid_colors, 4),
    },
    tips: list(r.tips, 4, 200),
    confidence: oneOf(r.confidence, CONFIDENCE, 'medium'),
    confidence_note: str(r.confidence_note, 200),
  }
}

export async function POST(request: NextRequest) {
  try {
    const blocked = await guard(request, 'body')
    if (blocked) return blocked

    const reqBody = await request.json()
    const imageBase64 = reqBody.imageBase64
    const gender = cleanText(reqBody.gender, 20)
    const langInstruction = cleanLang(reqBody.langInstruction)

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'No image provided' }, { status: 400, headers: HEADERS })
    }
    if (imageBase64.length > MAX_IMAGE_B64) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413, headers: HEADERS })
    }

    const g = gender.toLowerCase()
    const shapes = g.startsWith('men') ? SHAPES.men
      : g.startsWith('women') ? SHAPES.women
      : Array.from(new Set(SHAPES.women.concat(SHAPES.men)))

    const prompt = `You are Trenxia, a warm, body-positive personal stylist and colour analyst.
The user took a full-length mirror photo of themselves to get their body shape and personal colouring, so you can recommend what to wear.

Rules:
- Every body is a good body. Describe proportions neutrally and focus on what to highlight. Never mention weight, size, BMI, age, or attractiveness, and never suggest changing the body.
- Judge colouring only from visible skin undertone, hair and eye colour, and contrast between them. Never guess ethnicity or nationality.
- Mirror photos have uneven light: if the light is very warm, cool or dim, say so in confidence_note and lower confidence.
- If there is no person, more than one person, the body is not mostly visible (head to at least the knees), or the photo is too dark or blurry, return {"ok": false, "issue": "<one of: ${ISSUES.join(', ')}>", "message": "short friendly fix"} and nothing else.
- Choose body.shape from exactly one of: ${shapes.join(', ')}. Wardrobe gender: ${gender || 'any'}.
- ${langInstruction ? `Language for all human-readable text: ${langInstruction}` : 'Write all human-readable text in English.'} Keep enum values (shape, undertone, contrast, confidence, issue) in English exactly as listed.

Return ONLY a raw JSON object. No markdown. All strings on one line.
{
  "ok": true,
  "body": {
    "shape": "hourglass",
    "shape_label": "Hourglass (in the response language)",
    "summary": "1-2 warm sentences about their proportions and what makes them easy to dress",
    "highlights": ["feature to show off", "..."],
    "flatter": ["silhouette or cut that works", "...4-6 items"],
    "avoid": ["cut that hides their best features", "...2-4 items"],
    "necklines": ["V-neck", "..."],
    "best_pieces": ["specific garment", "...4-6 items"]
  },
  "color": {
    "undertone": "warm",
    "contrast": "medium",
    "season": "Soft Autumn",
    "summary": "1-2 sentences about their colouring",
    "metals": "Gold",
    "best_colors": [{"name": "Olive", "hex": "#708238"}, "...6-8 items"],
    "neutrals": [{"name": "Camel", "hex": "#C19A6B"}, "...3-4 items"],
    "avoid_colors": [{"name": "Icy blue", "hex": "#A5D8F3"}, "...2-4 items"]
  },
  "tips": ["short actionable tip", "...3-4 items"],
  "confidence": "high",
  "confidence_note": "e.g. Warm bathroom light; check colours in daylight"
}`

    const geminiRes = await fetch(geminiUrl(), {
      method: 'POST',
      headers: geminiHeaders(),
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 3000, thinkingConfig: { thinkingBudget: 0 } },
      }),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      console.error('Gemini body error:', geminiRes.status, JSON.stringify(err))
      return NextResponse.json({ error: '__errServer' }, { status: geminiRes.status === 429 ? 429 : 500, headers: HEADERS })
    }

    const data = await geminiRes.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text) {
      // Gemini blocks some images (safety); treat as an unusable photo
      console.error('Empty Gemini body response:', data.candidates?.[0]?.finishReason, data.promptFeedback?.blockReason)
      return NextResponse.json({ result: { ok: false, issue: 'no_person', message: '' } }, { headers: HEADERS })
    }

    let parsed: Record<string, any>
    try {
      parsed = extractJSON(text) as Record<string, any>
    } catch {
      console.error('Body JSON parse failed. Raw:', text.slice(0, 800))
      return NextResponse.json({ error: '__errServer' }, { status: 500, headers: HEADERS })
    }

    return NextResponse.json({ result: sanitize(parsed, shapes) }, { headers: HEADERS })
  } catch (error) {
    console.error('Body error:', error)
    return NextResponse.json({ error: '__errServer' }, { status: 500, headers: HEADERS })
  }
}
