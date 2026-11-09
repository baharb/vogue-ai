import { NextRequest, NextResponse } from 'next/server'
import { HEADERS, guard, optionsResponse, cleanLang, cleanText, cleanProfile, profilePrompt, MAX_IMAGE_B64, geminiUrl, geminiHeaders } from '../../../lib/guard'
import { extractJSON } from '../../../lib/json'
import { getTrends, trendingBrandsFor } from '../../../lib/trends'

// ─── FIND & SHOP ──────────────────────────────────────────────────────────────
// The user photographs a piece they like. Gemini names the item and writes a
// short stylist note; Google Shopping (via SerpApi) finds similar pieces to buy.
// Store links go out through Skimlinks / Amazon Associates so Trenxia earns a
// commission when someone buys. The photo is only sent to Gemini for this call.

export async function OPTIONS() {
  return optionsResponse()
}

const ISSUES = ['no_clothing', 'too_dark', 'blurry']

function str(v: unknown, max = 300): string {
  return typeof v === 'string' ? v.slice(0, max).trim() : ''
}
function list(v: unknown, n = 6, max = 120): string[] {
  return Array.isArray(v) ? v.map(x => str(x, max)).filter(Boolean).slice(0, n) : []
}

// ─── AFFILIATE LINKS ──────────────────────────────────────────────────────────
function isHost(url: URL, domain: string) {
  return url.hostname === domain || url.hostname.endsWith('.' + domain)
}

// Amazon links get our Associates tag; everything else goes through Skimlinks,
// which pays a commission at thousands of fashion stores. Without either
// configured the plain store link is returned.
function affiliateLink(raw: string): { url: string; affiliate: boolean } {
  let u: URL
  try { u = new URL(raw) } catch { return { url: raw, affiliate: false } }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { url: raw, affiliate: false }

  const amazonTag = process.env.AMAZON_TAG
  if (amazonTag && /(^|\.)amazon\.[a-z.]+$/.test(u.hostname)) {
    u.searchParams.set('tag', amazonTag)
    return { url: u.toString(), affiliate: true }
  }
  // Google's own product pages are not a store: Skimlinks can't earn on them
  const skim = process.env.SKIMLINKS_ID
  if (skim && !isHost(u, 'google.com')) {
    return { url: `https://go.skimresources.com/?id=${encodeURIComponent(skim)}&xs=1&url=${encodeURIComponent(u.toString())}`, affiliate: true }
  }
  return { url: u.toString(), affiliate: false }
}

// ─── PRODUCT SEARCH ───────────────────────────────────────────────────────────
type Product = {
  title: string; price: string; store: string; image: string
  url: string; affiliate: boolean; rating?: number; trending?: boolean
}

async function googleShopping(query: string, country: string): Promise<Product[]> {
  const key = process.env.SERPAPI_KEY
  if (!key || !query) return []
  const params = new URLSearchParams({ engine: 'google_shopping', q: query, gl: country, hl: 'en', num: '20', api_key: key })
  const res = await fetch(`https://serpapi.com/search.json?${params}`, { cache: 'no-store' })
  if (!res.ok) {
    console.error('SerpApi error:', res.status, (await res.text()).slice(0, 300))
    return []
  }
  const data = await res.json()
  const items: any[] = Array.isArray(data.shopping_results) ? data.shopping_results : []
  const out: Product[] = []
  const seen = new Set<string>()
  for (const r of items) {
    const link = str(r.link, 2000) || str(r.product_link, 2000)
    const title = str(r.title, 140)
    if (!link || !title) continue
    const key = title.toLowerCase().slice(0, 60) + '|' + str(r.source, 40).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const aff = affiliateLink(link)
    out.push({
      title,
      price: str(r.price, 30),
      store: str(r.source, 40),
      image: str(r.thumbnail, 2000),
      url: aff.url,
      affiliate: aff.affiliate,
      rating: typeof r.rating === 'number' ? r.rating : undefined,
    })
    if (out.length >= 12) break
  }
  return out
}

// Plain store searches, shown when no product API is set up (or as "see more").
function storeSearches(query: string) {
  const q = encodeURIComponent(query)
  const stores = [
    { store: 'Amazon', url: `https://www.amazon.com/s?k=${q}` },
    { store: 'SHEIN', url: `https://us.shein.com/pdsearch/${q}/` },
    { store: 'ASOS', url: `https://www.asos.com/us/search/?q=${q}` },
    { store: 'Nordstrom', url: `https://www.nordstrom.com/sr?keyword=${q}` },
  ]
  return stores.map(s => ({ store: s.store, ...affiliateLink(s.url) }))
}

// ─── ROUTE ────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const blocked = await guard(request, 'shop')
    if (blocked) return blocked

    const reqBody = await request.json()
    const imageBase64 = reqBody.imageBase64
    const gender = cleanText(reqBody.gender, 20)
    const langInstruction = cleanLang(reqBody.langInstruction)
    const profile = cleanProfile(reqBody.profile)

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'No image provided' }, { status: 400, headers: HEADERS })
    }
    if (imageBase64.length > MAX_IMAGE_B64) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413, headers: HEADERS })
    }

    const prompt = `You are Trenxia, an elite personal stylist and personal shopper.
The user photographed a clothing item or accessory they like and wants to buy something like it.

Identify the single most prominent clothing item or accessory in the photo (if a whole outfit is shown, pick the main piece).
- If there is no clothing or accessory, or the photo is too dark or blurry to tell, return {"ok": false, "issue": "<one of: ${ISSUES.join(', ')}>"} and nothing else.
- "query" is an English shopping search query a store search engine understands: colour + material/finish + key details + item type, 4-9 words, no brand names unless a logo is clearly visible. Example: "emerald satin cowl neck midi slip dress".
- Wardrobe gender: ${gender || 'any'} (add "women's" or "men's" to the query when it matters).
${profilePrompt(profile)}
- ${langInstruction ? `Language for all human-readable text except "query": ${langInstruction}` : 'Write all human-readable text in English.'}

Return ONLY a raw JSON object. No markdown. All strings on one line.
{
  "ok": true,
  "item": {
    "name": "Emerald satin slip dress (in the response language)",
    "category": "dress",
    "color": "Emerald green",
    "details": ["cowl neckline", "bias cut", "midi length"]
  },
  "query": "emerald satin cowl neck midi slip dress",
  "stylist_note": "1-2 sentences: why this piece works and how it suits the user if a profile is given",
  "pair_with": ["gold strappy heels", "...3-4 short items"]
}`

    const geminiRes = await fetch(geminiUrl(), {
      method: 'POST',
      headers: geminiHeaders(),
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }, { text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
      }),
    })

    if (!geminiRes.ok) {
      console.error('Gemini shop error:', geminiRes.status, (await geminiRes.text()).slice(0, 500))
      return NextResponse.json({ error: '__errServer' }, { status: geminiRes.status === 429 ? 429 : 500, headers: HEADERS })
    }

    const data = await geminiRes.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    let parsed: Record<string, any>
    try {
      parsed = extractJSON(text) as Record<string, any>
    } catch {
      console.error('Shop JSON parse failed. Raw:', text.slice(0, 500))
      return NextResponse.json({ error: 'Could not read AI response. Please try again.' }, { status: 500, headers: HEADERS })
    }

    const issue = ISSUES.includes(str(parsed.issue, 30)) ? str(parsed.issue, 30) : ''
    if (parsed.ok === false || issue) {
      return NextResponse.json({ result: { ok: false, issue: issue || 'no_clothing' } }, { headers: HEADERS })
    }

    const query = str(parsed.query, 120).replace(/[^\p{L}\p{N}' -]/gu, ' ').replace(/\s+/g, ' ').trim()
    const country = (process.env.SHOP_COUNTRY || 'us').toLowerCase().slice(0, 2)
    const products = await googleShopping(query, country).catch(err => {
      console.error('Shopping search failed:', err)
      return [] as Product[]
    })

    // Put products from brands that are trending now first, with a label.
    // The daily trend list is cached; don't let a cold start hold up results.
    const trendData = await Promise.race([
      getTrends('en').catch(() => null),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 8000)),
    ])
    const trendingBrands = trendingBrandsFor(trendData, gender)
    const brandRes = trendingBrands.map(b => new RegExp(`(^|[^\\p{L}])${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu'))
    for (const p of products) p.trending = brandRes.some(re => re.test(p.title) || re.test(p.store))
    products.sort((a, b) => Number(!!b.trending) - Number(!!a.trending))

    const it = parsed.item || {}
    const result = {
      ok: true,
      item: {
        name: str(it.name, 80),
        category: str(it.category, 40),
        color: str(it.color, 40),
        details: list(it.details, 4, 60),
      },
      query,
      stylist_note: str(parsed.stylist_note, 400),
      pair_with: list(parsed.pair_with, 4, 80),
      products,
      trending_brands: trendingBrands.slice(0, 6),
      searches: storeSearches(query),
    }

    return NextResponse.json({ result }, { headers: HEADERS })
  } catch (error) {
    console.error('Shop error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers: HEADERS })
  }
}
