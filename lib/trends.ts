import { geminiUrl, geminiHeaders } from './guard'
import { extractJSON } from './json'

// ─── DAILY FASHION TRENDS ─────────────────────────────────────────────────────
// Gemini with Google Search grounding finds what is trending in fashion right
// now: 8 trends to show in Explore, plus the brands that are hot this season
// (used to put trending brands first in Find & shop). Generated at most once a
// day per language and cached (Upstash Redis when configured, else in memory),
// so the search cost stays tiny however many people open Explore.

export type Trend = { title: string; summary: string; category: string; how_to_wear: string }
export type TrendData = {
  trends: Trend[]
  brands: { women: string[]; men: string[]; accessories: string[] }
  updated: string
}

const CATEGORIES = ['women', 'men', 'unisex', 'accessories', 'colours']
const TTL = 60 * 60 * 26
const memory = new Map<string, { value: TrendData; expires: number }>()
const inflight = new Map<string, Promise<TrendData | null>>()

// ─── CACHE ────────────────────────────────────────────────────────────────────
async function cacheGet(key: string): Promise<TrendData | null> {
  const hit = memory.get(key)
  if (hit && hit.expires > Date.now()) return hit.value
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.result) return null
    const value = JSON.parse(data.result) as TrendData
    memory.set(key, { value, expires: Date.now() + 10 * 60 * 1000 })
    return value
  } catch { return null }
}

async function cacheSet(key: string, value: TrendData) {
  memory.set(key, { value, expires: Date.now() + TTL * 1000 })
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return
  try {
    await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', key, JSON.stringify(value), 'EX', String(TTL)]]),
      cache: 'no-store',
    })
  } catch (err) { console.error('Trend cache write failed:', err) }
}

// ─── GENERATION ───────────────────────────────────────────────────────────────
function str(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.slice(0, max).trim() : ''
}
function names(v: unknown, n: number): string[] {
  return Array.isArray(v) ? Array.from(new Set(v.map(x => str(x, 40)).filter(Boolean))).slice(0, n) : []
}

async function generate(langInstruction: string): Promise<TrendData | null> {
  const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const prompt = `You are Trenxia, a fashion trend editor. Use Google Search to find what is trending in fashion RIGHT NOW (${month}): current-season runway-to-street trends, viral styles, colours and accessories that people are actually wearing and buying.

Pick 8 trends that are useful for everyday people: a mix of women, men, unisex, accessories and colours. Avoid trends that are clearly over.
Also list brands that are especially popular or talked-about right now (real brands with online stores, a mix of price levels from high street to designer).

${langInstruction ? `Language for title, summary and how_to_wear: ${langInstruction}` : 'Write title, summary and how_to_wear in English.'} Keep "category" and brand names exactly as specified (English / original brand names).

Return ONLY a raw JSON object. No markdown. All strings on one line.
{
  "trends": [
    {"title": "2-5 word trend name", "summary": "one sentence: what it is and why it is hot now", "category": "one of: ${CATEGORIES.join(', ')}", "how_to_wear": "one practical sentence"}
  ],
  "brands": {
    "women": ["8 brand names"],
    "men": ["8 brand names"],
    "accessories": ["6 brand names (bags, shoes, jewellery)"]
  }
}`

  const res = await fetch(geminiUrl(), {
    method: 'POST',
    headers: geminiHeaders(),
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
    }),
  })
  if (!res.ok) {
    console.error('Gemini trends error:', res.status, (await res.text()).slice(0, 400))
    return null
  }
  const data = await res.json()
  const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('')
  let r: Record<string, any>
  try { r = extractJSON(text) as Record<string, any> } catch {
    console.error('Trends JSON parse failed:', text.slice(0, 400))
    return null
  }
  const trends: Trend[] = (Array.isArray(r.trends) ? r.trends : [])
    .map((t: any) => ({
      title: str(t?.title, 60),
      summary: str(t?.summary, 220),
      category: CATEGORIES.includes(str(t?.category, 20).toLowerCase()) ? str(t?.category, 20).toLowerCase() : 'unisex',
      how_to_wear: str(t?.how_to_wear, 220),
    }))
    .filter((t: Trend) => t.title && t.summary)
    .slice(0, 8)
  if (trends.length < 3) return null
  const b = r.brands || {}
  return {
    trends,
    brands: { women: names(b.women, 10), men: names(b.men, 10), accessories: names(b.accessories, 8) },
    updated: new Date().toISOString(),
  }
}

// Today's trends in a language (lang = 2-letter app language code).
export async function getTrends(lang = 'en', langInstruction = ''): Promise<TrendData | null> {
  const code = /^[a-z]{2}$/.test(lang) ? lang : 'en'
  const key = `tx:trends:${new Date().toISOString().slice(0, 10)}:${code}`
  const cached = await cacheGet(key)
  if (cached) return cached
  if (inflight.has(key)) return inflight.get(key)!
  const job = generate(code === 'en' ? '' : langInstruction)
    .then(async v => { if (v) await cacheSet(key, v); return v })
    .finally(() => inflight.delete(key))
  inflight.set(key, job)
  return job
}

// Brands trending now for a wardrobe gender ("Women's", "Men's", "Unisex").
export function trendingBrandsFor(data: TrendData | null, gender: string): string[] {
  if (!data) return []
  const g = gender.toLowerCase()
  const list = g.startsWith('men') ? [...data.brands.men, ...data.brands.accessories]
    : g.startsWith('women') ? [...data.brands.women, ...data.brands.accessories]
    : [...data.brands.women, ...data.brands.men, ...data.brands.accessories]
  return Array.from(new Set(list))
}
