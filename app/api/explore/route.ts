import { NextRequest, NextResponse } from 'next/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// Trim text to the last complete sentence within maxChars.
// Handles Latin, Persian/Arabic (؟ ۔), and CJK (。！？) sentence endings.
// This guarantees the answer always ends cleanly — never mid-word or mid-sentence.
function trimToLastSentence(text: string, maxChars = 1200): string {
  if (text.length <= maxChars) return text
  const chunk = text.slice(0, maxChars)
  const lastEnd = Math.max(
    chunk.lastIndexOf('.'),
    chunk.lastIndexOf('!'),
    chunk.lastIndexOf('?'),
    chunk.lastIndexOf('؟'),   // Arabic/Persian question mark
    chunk.lastIndexOf('۔'),   // Urdu/Persian full stop
    chunk.lastIndexOf('。'),   // CJK full stop
    chunk.lastIndexOf('！'),   // Full-width exclamation
    chunk.lastIndexOf('？'),   // Full-width question mark
  )
  // Only cut at sentence boundary if it's not too close to the start
  if (lastEnd > maxChars * 0.4) {
    return chunk.slice(0, lastEnd + 1).trim()
  }
  // Fallback: cut at last space (word boundary)
  const lastSpace = chunk.lastIndexOf(' ')
  return chunk.slice(0, lastSpace > 0 ? lastSpace : maxChars).trim()
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
Answer this fashion question with expert knowledge. Be specific and helpful.
${langInstruction || 'Respond in English.'}

Question: ${question}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 3000,
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
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!raw) {
      console.error('Empty Gemini explore response:', JSON.stringify(data))
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500, headers: CORS })
    }

    // Always return a clean, complete-sentence answer within 1200 chars
    const answer = trimToLastSentence(raw, 1200)

    return NextResponse.json({ answer }, { headers: CORS })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Explore error:', msg)
    return NextResponse.json({ error: 'Server exception', detail: msg }, { status: 500, headers: CORS })
  }
}
