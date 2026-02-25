import { NextRequest } from 'next/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, occasion, vibe, gender, langInstruction } = await request.json()

    if (!imageBase64) {
      return Response.json({ error: 'No image provided' }, { status: 400, headers: CORS })
    }

    // Language instruction — placed at TOP and BOTTOM for maximum effect
    const langBlock = langInstruction
      ? `🌐 LANGUAGE RULE (HIGHEST PRIORITY): ${langInstruction}
You MUST write EVERY single text value in that language. This includes:
- headline, stylist_note, style_archetype
- every category "note" field
- every improvement "item" and "action" field  
- every item in "what_works" array
- upgrade_tip
DO NOT write any of these fields in English if a different language is requested.`
      : ''

    const prompt = `${langBlock}

You are VOGUE — an elite AI fashion stylist. Analyze this outfit image.

Context: Occasion="${occasion || 'Casual'}", Style="${vibe || 'any'}", Gender="${gender || 'any'}"

Respond with ONLY a raw JSON object. No markdown. No backticks. No explanation. Just JSON starting with { and ending with }.

Required JSON structure (ALL text values must be in the requested language):
{
  "overall_score": 7.4,
  "headline": "One punchy sentence about the outfit",
  "stylist_note": "2-3 honest specific sentences about the actual items visible in the photo",
  "style_archetype": "Style name",
  "categories": [
    {"name": "Color Harmony", "score": 8.2, "note": "specific observation in requested language"},
    {"name": "Fit & Proportions", "score": 7.0, "note": "specific observation in requested language"},
    {"name": "Occasion Match", "score": 8.5, "note": "specific observation in requested language"},
    {"name": "Trend Awareness", "score": 6.8, "note": "specific observation in requested language"},
    {"name": "Accessories", "score": 7.2, "note": "specific observation in requested language"},
    {"name": "Fabric & Texture", "score": 7.5, "note": "specific observation in requested language"},
    {"name": "Overall Vibe", "score": 7.8, "note": "specific observation in requested language"}
  ],
  "improvements": [
    {"priority": "high", "item": "item name in requested language", "action": "fix description in requested language"},
    {"priority": "medium", "item": "item name in requested language", "action": "fix description in requested language"},
    {"priority": "low", "item": "item name in requested language", "action": "fix description in requested language"}
  ],
  "what_works": ["strength 1 in requested language", "strength 2 in requested language", "strength 3 in requested language"],
  "trend_tags": ["#tag1", "#tag2", "#tag3"],
  "upgrade_tip": "one power move tip in requested language",
  "color_palette": ["#8B7355", "#2C2416", "#C4A882"]
}

${langBlock}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8000
          }
        })
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json()
      console.error('Gemini error:', err)
      return Response.json({ error: 'AI analysis failed. Please try again.' }, { status: 500, headers: CORS })
    }

    const geminiData = await geminiRes.json()
    const candidate = geminiData.candidates?.[0]
    const text = candidate?.content?.parts?.[0]?.text || ''

    console.log('Gemini finish reason:', candidate?.finishReason)
    console.log('Gemini text preview:', text.slice(0, 300))

    if (!text) {
      console.error('Empty Gemini response:', JSON.stringify(geminiData))
      return Response.json({ error: 'AI returned empty response. Please try again.' }, { status: 500, headers: CORS })
    }

    // Extract JSON — robust parsing
    let result
    try {
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      if (start === -1 || end === -1) {
        console.error('No JSON braces. Full text:', text)
        throw new Error('No JSON found in response')
      }
      let jsonStr = clean.slice(start, end + 1)
      try {
        result = JSON.parse(jsonStr)
      } catch {
        jsonStr = jsonStr.replace(/,\s*$/, '').replace(/,\s*]/, ']').replace(/,\s*}/, '}')
        const opens = (jsonStr.match(/{/g) || []).length
        const closes = (jsonStr.match(/}/g) || []).length
        for (let i = 0; i < opens - closes; i++) jsonStr += '}'
        result = JSON.parse(jsonStr)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message, '\nRaw text:', text.slice(0, 500))
      return Response.json({ error: 'Could not parse AI response. Please try again.' }, { status: 500, headers: CORS })
    }

    return Response.json({ result }, { headers: CORS })

  } catch (error) {
    console.error('Analyze error:', error)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers: CORS })
  }
}
