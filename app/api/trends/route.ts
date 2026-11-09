import { NextRequest, NextResponse } from 'next/server'
import { HEADERS, guard, optionsResponse, cleanLang, cleanText } from '../../../lib/guard'
import { getTrends } from '../../../lib/trends'

// ─── TRENDING NOW ─────────────────────────────────────────────────────────────
// Today's fashion trends for the Explore screen (cached once a day per language).

export async function OPTIONS() {
  return optionsResponse()
}

export async function POST(request: NextRequest) {
  try {
    const blocked = await guard(request, 'trends')
    if (blocked) return blocked

    const body = await request.json().catch(() => ({}))
    const lang = cleanText(body.lang, 2).toLowerCase()
    const langInstruction = cleanLang(body.langInstruction)

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not set on server')
      return NextResponse.json({ error: 'Server error' }, { status: 500, headers: HEADERS })
    }

    const data = await getTrends(lang || 'en', langInstruction)
    if (!data) return NextResponse.json({ error: 'Trends unavailable' }, { status: 503, headers: HEADERS })

    return NextResponse.json({ trends: data.trends, updated: data.updated }, { headers: HEADERS })
  } catch (error) {
    console.error('Trends error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: HEADERS })
  }
}
