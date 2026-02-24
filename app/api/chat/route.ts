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

    const systemMsg = {
      role: 'user',
      parts: [{ text: `You are VOGUE, an elite AI fashion stylist. Give sharp, specific, honest fashion advice like a knowledgeable stylish friend. Keep responses under 150 words. Outfit context: ${context || ''}` }]
    }
    const systemReply = {
      role: 'model',
      parts: [{ text: 'Ready to give honest, specific fashion advice.' }]
    }

    const conversationHistory = (history || []).map((m: { role: string; text: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }))

    const contents = [systemMsg, systemReply, ...conversationHistory, { role: 'user', parts: [{ text: message }] }]

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.8, maxOutputTokens: 400 } })
      }
    )

    if (!geminiRes.ok) return Response.json({ error: 'Chat failed' }, { status: 500, headers: CORS })

    const data = await geminiRes.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return Response.json({ reply }, { headers: CORS })

  } catch (error) {
    console.error('Chat error:', error)
    return Response.json({ error: 'Chat failed. Try again.' }, { status: 500, headers: CORS })
  }
}
