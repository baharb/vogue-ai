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
    const { question, langInstruction } = await request.json()

    if (!question) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400, headers: CORS })
    }

    const prompt = `You are Trenxia, an elite fashion stylist and trend expert with encyclopedic knowledge of fashion history, current trends, styling rules, and body proportion theory.
Answer this question with expert knowledge and real personality. Be specific, actionable, and opinionated — like a knowledgeable stylish friend.
Give a thorough, complete answer. Write at least 3-5 full sentences. Never cut your answer short mid-sentence.
${langInstruction || 'Respond in English.'}

Question: ${question}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1200 }
        })
      }
    )

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({ status: geminiRes.status }))
      console.error('Gemini explore error:', JSON.stringify(errBody))
      return NextResponse.json(
        { error: 'Explore failed', detail: errBody?.error?.message || `HTTP ${geminiRes.status}` },
        { status: 500, headers: CORS }
      )
    }

    const data = await geminiRes.json()
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!answer) {
      console.error('Gemini explore: empty answer. Full response:', JSON.stringify(data))
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500, headers: CORS })
    }

    return NextResponse.json({ answer }, { headers: CORS })

  } catch (error) {
    console.error('Explore error:', error)
    return NextResponse.json({ error: 'Could not load answer.' }, { status: 500, headers: CORS })
  }
}
