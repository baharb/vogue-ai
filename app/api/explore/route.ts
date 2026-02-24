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
    const { question } = await request.json()

    if (!question) {
      return Response.json({ error: 'No question provided' }, { status: 400, headers: CORS })
    }

    const prompt = `You are VOGUE, an elite fashion stylist and trend expert. Answer this question with expert knowledge and real personality. Be specific, actionable, and opinionated — like a knowledgeable stylish friend. Keep it under 180 words.\n\nQuestion: ${question}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 400 } })
      }
    )

    if (!geminiRes.ok) return Response.json({ error: 'Explore failed' }, { status: 500, headers: CORS })

    const data = await geminiRes.json()
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return Response.json({ answer }, { headers: CORS })

  } catch (error) {
    console.error('Explore error:', error)
    return Response.json({ error: 'Could not load answer.' }, { status: 500, headers: CORS })
  }
}
