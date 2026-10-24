import { NextRequest, NextResponse } from 'next/server'
import { HEADERS, guard, optionsResponse, cleanLang, cleanText, cleanProfile, profilePrompt, geminiUrl, geminiHeaders } from '../../../lib/guard'

export async function OPTIONS() {
  return optionsResponse()
}

// Drop an unfinished last sentence so the reply ends cleanly.
// Handles Latin, Persian/Arabic (؟ ۔), and CJK (。！？) sentence endings.
// Only used when Gemini hits its token limit and stops mid-sentence.
function trimToLastSentence(text: string): string {
  const chunk = text.trim()
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
  if (lastEnd > chunk.length * 0.4) {
    return chunk.slice(0, lastEnd + 1).trim()
  }
  // Fallback: cut at last space (word boundary)
  const lastSpace = chunk.lastIndexOf(' ')
  return lastSpace > 0 ? chunk.slice(0, lastSpace).trim() : chunk
}

export async function POST(request: NextRequest) {
  try {
    const blocked = await guard(request, 'explore')
    if (blocked) return blocked

    const body = await request.json()
    const question = cleanText(body.question, 1000)
    const langInstruction = cleanLang(body.langInstruction)
    const profile = cleanProfile(body.profile)

    if (!question) {
      return NextResponse.json({ error: 'No question provided' }, { status: 400, headers: HEADERS })
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not set on server')
      return NextResponse.json({ error: 'Server error' }, { status: 500, headers: HEADERS })
    }

    const prompt = `You are Trenxia, an elite fashion stylist and trend expert.
Answer this fashion question with expert knowledge. Be specific and helpful.

Keep it short enough to read on a phone in under a minute: about 120–200 words
(similar length in other languages). Start with the direct answer in one or two
sentences, then give at most 3–5 concrete tips as a short bullet list. You may use
**bold** for key items. No long introductions, no headings, no tables, no sign-off.
Always finish your last sentence.
${profilePrompt(profile)}
${langInstruction || 'Respond in English.'}

Question: ${question}`

    const geminiRes = await fetch(
      geminiUrl(),
      {
        method: 'POST',
        headers: geminiHeaders(),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1024,
            thinkingConfig: { thinkingBudget: 0 },
          }
        })
      }
    )

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text()
      console.error('Gemini explore error:', geminiRes.status, errBody)
      return NextResponse.json({ error: 'Explore failed. Please try again.' }, { status: 500, headers: HEADERS })
    }

    const data = await geminiRes.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const finishReason = data.candidates?.[0]?.finishReason

    if (!raw) {
      console.error('Empty Gemini explore response:', JSON.stringify(data))
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500, headers: HEADERS })
    }

    // The prompt keeps answers short; only trim if Gemini ran out of tokens mid-reply
    const answer = finishReason === 'MAX_TOKENS' ? trimToLastSentence(raw) : raw.trim()

    return NextResponse.json({ answer }, { headers: HEADERS })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Explore error:', msg)
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: HEADERS })
  }
}
