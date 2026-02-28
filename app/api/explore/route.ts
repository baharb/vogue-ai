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

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set on server' }, { status: 500, headers: CORS })
    }

    const prompt = `You are Trenxia, an elite fashion stylist and trend expert.
Answer this fashion question thoroughly. Write a complete answer — do not stop mid-sentence.
${langInstruction || 'Respond in English.'}

Question: ${question}

Write your full answer now:`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 3000,  // High enough for Persian/Arabic/CJK which use more tokens
          }
        })
      }
    )

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text()
      console.error('Gemini explore error:', geminiRes.status, errBody)
      return NextResponse.json(
        { error: `Gemini error ${geminiRes.status}`, detail: errBody },
        { status: 500, headers: CORS }
      )
    }

    const data = await geminiRes.json()

    // Check if response was cut off due to token limit
    const finishReason = data.candidates?.[0]?.finishReason
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!answer) {
      console.error('Empty Gemini explore response. Finish reason:', finishReason, JSON.stringify(data))
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500, headers: CORS })
    }

    // If cut off by max tokens, add ellipsis so frontend knows
    const finalAnswer = (finishReason === 'MAX_TOKENS')
      ? answer.trimEnd() + '…'
      : answer

    return NextResponse.json({ answer: finalAnswer }, { headers: CORS })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Explore error:', msg)
    return NextResponse.json({ error: 'Server exception', detail: msg }, { status: 500, headers: CORS })
  }
}
