import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { question, langInstruction } = await request.json()

    if (!question) {
      return Response.json({ error: 'No question provided' }, { status: 400 })
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

    if (!geminiRes.ok) return Response.json({ error: 'Explore failed' }, { status: 500 })

    const data = await geminiRes.json()
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return Response.json({ answer })

  } catch (error) {
    console.error('Explore error:', error)
    return Response.json({ error: 'Could not load answer.' }, { status: 500 })
  }
}
