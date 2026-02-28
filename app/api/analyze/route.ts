import { NextRequest, NextResponse } from 'next/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, occasion, vibe, gender, langInstruction } = await request.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400, headers: CORS })
    }

    const prompt = `You are Trenxia — an elite AI fashion stylist with the sharp eye of a Vogue editor,
the warmth of a personal stylist, and the honesty of a best friend. Analyze this outfit image with
extreme specificity — reference the actual items you see in the photo.

Context: Occasion="${occasion || 'Casual'}", Style="${vibe || 'any'}", Gender="${gender || 'any'}"
${langInstruction ? `Language instruction: ${langInstruction}` : 'Respond in English.'}

Respond ONLY with valid JSON, absolutely no markdown or extra text:
{
  "overall_score": 7.4,
  "headline": "One sharp punchy sentence about this look",
  "stylist_note": "2-3 sentences — honest, specific, warm. Reference exact items you see.",
  "style_archetype": "e.g. Off-Duty Model / Corporate Minimalist / Street Luxe",
  "categories": [
    {"name":"Color Harmony","score":8.2,"note":"specific observation"},
    {"name":"Fit & Proportions","score":7.0,"note":"specific observation"},
    {"name":"Occasion Match","score":8.5,"note":"specific observation"},
    {"name":"Trend Awareness","score":6.8,"note":"specific observation"},
    {"name":"Accessories","score":7.2,"note":"specific observation"},
    {"name":"Fabric & Texture","score":7.5,"note":"specific observation"},
    {"name":"Overall Vibe","score":7.8,"note":"specific observation"}
  ],
  "improvements": [
    {"priority":"high","item":"Specific item","action":"Exact fix"},
    {"priority":"medium","item":"Specific item","action":"Exact fix"},
    {"priority":"low","item":"Specific item","action":"Exact fix"}
  ],
  "what_works": ["Strength 1","Strength 2","Strength 3"],
  "trend_tags": ["#tag1","#tag2","#tag3"],
  "upgrade_tip": "One power move to jump the score",
  "color_palette": ["#hex1","#hex2","#hex3"]
}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }, { text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
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
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return NextResponse.json({ result }, { headers: CORS })

  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers: CORS })
  }
}
