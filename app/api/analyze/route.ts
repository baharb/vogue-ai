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

    const prompt = `You are VOGUE — an elite AI fashion stylist. Analyze this outfit image.

Context: Occasion="${occasion || 'Casual'}", Style="${vibe || 'any'}", Gender="${gender || 'any'}"

${langInstruction ? `IMPORTANT: ${langInstruction} Write ALL text fields in that language: headline, stylist_note, style_archetype, all category notes, all improvement items and actions, all what_works items, and upgrade_tip.` : ''}

Respond with ONLY a raw JSON object. No markdown. No backticks. No explanation. Just JSON starting with { and ending with }.

{"overall_score":7.4,"headline":"One punchy sentence","stylist_note":"2-3 honest specific sentences about the actual items visible in the photo.","style_archetype":"Off-Duty Model","categories":[{"name":"Color Harmony","score":8.2,"note":"specific observation"},{"name":"Fit & Proportions","score":7.0,"note":"specific observation"},{"name":"Occasion Match","score":8.5,"note":"specific observation"},{"name":"Trend Awareness","score":6.8,"note":"specific observation"},{"name":"Accessories","score":7.2,"note":"specific observation"},{"name":"Fabric & Texture","score":7.5,"note":"specific observation"},{"name":"Overall Vibe","score":7.8,"note":"specific observation"}],"improvements":[{"priority":"high","item":"Item","action":"Fix"},{"priority":"medium","item":"Item","action":"Fix"},{"priority":"low","item":"Item","action":"Fix"}],"what_works":["Strength 1","Strength 2","Strength 3"],"trend_tags":["#tag1","#tag2","#tag3"],"upgrade_tip":"One power move","color_palette":["#8B7355","#2C2416","#C4A882"]}`

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
      // Fix truncated JSON by ensuring it ends properly
      try {
        result = JSON.parse(jsonStr)
      } catch {
        // Try to fix common truncation issues
        jsonStr = jsonStr.replace(/,\s*$/, '').replace(/,\s*]/, ']').replace(/,\s*}/, '}')
        // Count braces and close any open ones
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
