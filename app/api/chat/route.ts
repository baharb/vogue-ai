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
    const { message, context, history } = await request.json()

    if (!message) {
      return Response.json({ error: 'No message provided' }, { status: 400, headers: CORS })
    }

    const systemPrompt = `You are VOGUE, an elite AI personal fashion stylist — sharp, specific, warm, and honest like a knowledgeable best friend.

You have already analyzed this outfit. Here is your full analysis:
${context || 'No outfit context provided.'}

Rules:
- Answer ONLY about this specific outfit based on the analysis above
- Be specific — reference actual items from the analysis (colors, pieces, fit notes)
- Give concrete, actionable advice (specific shoe styles, color names, brands if helpful)
- Keep responses to 2-4 sentences — punchy and useful
- Never give generic fashion advice — always tie it back to THIS outfit`

    const systemMsg = {
      role: 'user',
      parts: [{ text: systemPrompt }]
    }
    const systemReply = {
      role: 'model',
      parts: [{ text: 'I\'ve reviewed the full analysis. Ask me anything about this specific outfit.' }]
    }

    const conversationHistory = (history || []).map((m: { role: string; text: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }))

    const contents = [
      systemMsg,
      systemReply,
      ...conversationHistory,
      { role: 'user', parts: [{ text: message }] }
    ]

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.8, maxOutputTokens: 1000 }
        })
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json()
      console.error('Chat Gemini error:', err)
      return Response.json({ error: 'Chat failed' }, { status: 500, headers: CORS })
    }

    const data = await geminiRes.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return Response.json({ reply }, { headers: CORS })

  } catch (error) {
    console.error('Chat error:', error)
    return Response.json({ error: 'Chat failed. Try again.' }, { status: 500, headers: CORS })
  }
}