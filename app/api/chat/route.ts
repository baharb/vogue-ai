import { NextRequest, NextResponse } from 'next/server'
import { HEADERS, guard, optionsResponse, cleanLang, cleanText, MAX_HISTORY, geminiUrl, geminiHeaders } from '../../../lib/guard'

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(request: NextRequest) {
  try {
    const blocked = await guard(request, 'chat')
    if (blocked) return blocked

    const body = await request.json()
    const message = cleanText(body.message)
    const context = cleanText(body.context, 4000)
    const langInstruction = cleanLang(body.langInstruction)
    const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : []

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400, headers: HEADERS })
    }

    const systemMsg = {
      role: 'user',
      parts: [{ text: `You are Trenxia, an elite AI fashion stylist. Give sharp, specific, honest fashion advice like a knowledgeable stylish friend. Give complete, thorough answers — never cut off mid-sentence. ${langInstruction || 'Respond in English.'} Outfit context: ${context || ''}` }]
    }
    const systemReply = {
      role: 'model',
      parts: [{ text: 'Ready to give honest, specific fashion advice.' }]
    }

    const conversationHistory = history.map((m: { role: string; text: string }) => ({
      role: m?.role === 'user' ? 'user' : 'model',
      parts: [{ text: cleanText(m?.text) }]
    }))

    const contents = [systemMsg, systemReply, ...conversationHistory, { role: 'user', parts: [{ text: message }] }]

    const geminiRes = await fetch(
      geminiUrl(),
      {
        method: 'POST',
        headers: geminiHeaders(),
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.8, maxOutputTokens: 2500, thinkingConfig: { thinkingBudget: 0 } } })
      }
    )

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({ status: geminiRes.status }))
      console.error('Gemini chat error:', JSON.stringify(errBody))
      return NextResponse.json({ error: 'Chat failed. Please try again.' }, { status: 500, headers: HEADERS })
    }

    const data = await geminiRes.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return NextResponse.json({ reply }, { headers: HEADERS })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Chat failed. Try again.' }, { status: 500, headers: HEADERS })
  }
}
