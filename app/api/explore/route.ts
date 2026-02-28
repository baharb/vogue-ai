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

    // Check API key exists
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set on server' }, { status: 500, headers: CORS })
    }

    const prompt = `You are Trenxia, an elite fashion stylist. Answer this fashion question thoroughly and completely in at least 4-5 sentences. Never cut your answer short.
${langInstruction || 'Respond in English.'}

Question: ${question}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1200 }
        })
      }
    )

    // Return full Gemini error so we can see what's wrong
    if (!geminiRes.ok) {
      const errBody = await geminiRes.text()
      console.error('Gemini error status:', geminiRes.status, 'body:', errBody)
      return NextResponse.json(
        { error: `Gemini error ${geminiRes.status}`, detail: errBody },
        { status: 500, headers: CORS }
      )
    }

    const data = await geminiRes.json()
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!answer) {
      return NextResponse.json(
        { error: 'Empty answer from Gemini', detail: JSON.stringify(data) },
        { status: 500, headers: CORS }
      )
    }

    return NextResponse.json({ answer }, { headers: CORS })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Explore error:', msg)
    return NextResponse.json({ error: 'Server exception', detail: msg }, { status: 500, headers: CORS })
  }
}
