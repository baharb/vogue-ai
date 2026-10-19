import { NextRequest, NextResponse } from 'next/server'

// ─── API GUARD ────────────────────────────────────────────────────────────────
// Protects the Gemini-backed routes from abuse:
//   1. App key      — the mobile app sends X-Trenxia-Key (env APP_CLIENT_KEY).
//                     Requests from this site's own pages are allowed without it.
//   2. Daily quotas — per device (X-Device-Id) and per IP, per route.
//   3. Global cap   — total Gemini calls per day across everyone (cost ceiling).
//
// Counters live in Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN are set
// (shared across all serverless instances). Without them an in-memory map is
// used, which only limits per instance — fine for local dev, not for production.

export type Route = 'analyze' | 'chat' | 'explore'

const DEFAULT_LIMITS: Record<Route, { device: number; ip: number }> = {
  analyze: { device: 10, ip: 30 },
  chat:    { device: 60, ip: 150 },
  explore: { device: 40, ip: 100 },
}

function envInt(name: string, fallback: number): number {
  const n = parseInt(process.env[name] || '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function limitsFor(route: Route) {
  const up = route.toUpperCase()
  return {
    device: envInt(`LIMIT_${up}_DEVICE`, DEFAULT_LIMITS[route].device),
    ip:     envInt(`LIMIT_${up}_IP`,     DEFAULT_LIMITS[route].ip),
  }
}

// No Access-Control-Allow-Origin: native apps don't need CORS, and this site's
// own pages are same-origin. Other websites can no longer call the API.
export const HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Trenxia-Key, X-Device-Id',
}

export function optionsResponse() {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

export function jsonError(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status, headers: HEADERS })
}

// ─── COUNTER STORE ────────────────────────────────────────────────────────────
const memory = new Map<string, { count: number; expires: number }>()

async function incr(key: string, ttlSeconds: number): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['EXPIRE', key, String(ttlSeconds), 'NX']]),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Redis ${res.status}`)
    const data = await res.json()
    return Number(data?.[0]?.result) || 0
  }
  const now = Date.now()
  const hit = memory.get(key)
  if (!hit || hit.expires < now) {
    memory.set(key, { count: 1, expires: now + ttlSeconds * 1000 })
    return 1
  }
  hit.count += 1
  return hit.count
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  return fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
}

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (!origin || !host) return false
  try { return new URL(origin).host === host } catch { return false }
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const DEVICE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/

// Returns an error response when the request must be refused, otherwise null.
export async function guard(req: NextRequest, route: Route): Promise<NextResponse | null> {
  const appKey = process.env.APP_CLIENT_KEY
  const sentKey = req.headers.get('x-trenxia-key') || ''
  const fromApp = !!appKey && safeEqual(sentKey, appKey)

  if (appKey && !fromApp && !isSameOrigin(req)) {
    return jsonError('unauthorized', 401)
  }

  const deviceId = req.headers.get('x-device-id') || ''
  const day = new Date().toISOString().slice(0, 10)
  const ttl = 60 * 60 * 26
  const limits = limitsFor(route)

  try {
    const global = await incr(`tx:${day}:global`, ttl)
    if (global > envInt('GLOBAL_DAILY_LIMIT', 5000)) {
      return jsonError('__errBusy', 503, { code: 'global_limit' })
    }

    const ipCount = await incr(`tx:${day}:${route}:ip:${clientIp(req)}`, ttl)
    if (ipCount > limits.ip) {
      return jsonError('__errDailyLimit', 429, { code: 'daily_limit' })
    }

    if (DEVICE_ID_RE.test(deviceId)) {
      const devCount = await incr(`tx:${day}:${route}:dev:${deviceId}`, ttl)
      if (devCount > limits.device) {
        return jsonError('__errDailyLimit', 429, { code: 'daily_limit', limit: limits.device })
      }
    }
  } catch (err) {
    // Counter store down: fail open so the app keeps working, but log it.
    console.error('Rate limit store error:', err)
  }

  return null
}

// ─── INPUT LIMITS ─────────────────────────────────────────────────────────────
export const MAX_IMAGE_B64 = 6_000_000 // ≈4.5 MB image
export const MAX_TEXT = 2000
export const MAX_HISTORY = 20

// langInstruction is free text from the client that goes straight into the
// prompt; keep it short so it can't carry a long injected prompt.
export function cleanLang(s: unknown): string {
  return typeof s === 'string' ? s.slice(0, 300) : ''
}

export function cleanText(s: unknown, max = MAX_TEXT): string {
  return typeof s === 'string' ? s.slice(0, max) : ''
}

export function geminiUrl(model = 'gemini-2.5-flash') {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}

// Key in a header, not the URL, so it never shows up in request logs.
export function geminiHeaders() {
  return { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY || '' }
}
