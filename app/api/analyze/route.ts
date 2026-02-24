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
    const { imageBase64, occasion, vibe, gender } = await request.json()

    if (!imageBase64) {
      return Response.json({ error: 'No image provided' }, { status: 400, headers: CORS })
    }

    const prompt = `You are VOGUE — an elite AI fashion stylist. Analyze this outfit image.

Context: Occasion="${occasion || 'Casual'}", Style="${vibe || 'any'}", Gender="${gender || 'any'}"

You MUST respond with ONLY a valid JSON object. No markdown, no backticks, no explanation. Start with { and end with }.

Use this exact structure:
{"overall_score":7.4,"headline":"One punchy sentence about this look","stylist_note":"2-3 honest specific sentences referencing exact items visible.","style_archetype":"Off-Duty Model","categories":[{"name":"Color Harmony","score":8.2,"note":"observation"},{"name":"Fit & Proportions","score":7.0,"note":"observation"},{"name":"Occasion Match","score":8.5,"note":"observation"},{"name":"Trend Awareness","score":6.8,"note":"observation"},{"name":"Accessories","score":7.2,"note":"observation"},{"name":"Fabric & Texture","score":7.5,"note":"observation"},{"name":"Overall Vibe","score":7.8,"note":"observation"}],"improvements":[{"priority":"high","item":"Item name","action":"Specific fix"},{"priority":"medium","item":"Item name","action":"Specific fix"},{"priority":"low","item":"Item name","action":"Specific fix"}],"what_works":["Strength 1","Strength 2","Strength 3"],"trend_tags":["#tag1","#tag2","#tag3"],"upgrade_tip":"One power move to raise the score","color_palette":["#8B7355","#2C2416","#C4A882"]}`

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

    console.log('Finish reason:', candidate?.finishReason)
    console.log('Text preview:', text.slice(0, 300))

    if (!text) {
      console.error('Empty response:', JSON.stringify(geminiData))
      return Response.json({ error: 'AI returned empty response. Try again.' }, { status: 500, headers: CORS })
    }

    // Robust JSON extraction
    let result
    try {
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('No JSON braces found')
      result = JSON.parse(clean.slice(start, end + 1))
    } catch (e) {
      console.error('Parse error:', e, 'Raw text:', text.slice(0, 500))
      return Response.json({ error: 'Could not parse AI response. Try again.' }, { status: 500, headers: CORS })
    }

    return Response.json({ result }, { headers: CORS })

  } catch (error) {
    console.error('Analyze error:', error)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers: CORS })
  }
}