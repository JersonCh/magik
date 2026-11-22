import { getRuntimeEnv } from "../database/client"

export const ADMIN_SESSION_COOKIE = "magik_admin_session"
const SESSION_TTL_SECONDS = 60 * 60 * 8 // 8 horas
const DEFAULT_ADMIN_EMAIL = "admin@magikbarber.pe"
const DEV_FALLBACK_PASSWORD = "magik"
const DEV_FALLBACK_SECRET = "magik-dev-local-hmac-secret-do-not-use-in-prod"

export interface AdminSession {
  email: string
  role: "admin"
  iat: number
  exp: number
}

interface AuthConfig {
  configured: boolean
  email: string
  password: string
  secret: string
}

let devWarningLogged = false

function readEnvString(runtimeEnv: Record<string, unknown> | null, key: string): string | undefined {
  const fromRuntime = runtimeEnv?.[key]
  if (typeof fromRuntime === "string" && fromRuntime.trim().length > 0) {
    return fromRuntime.trim()
  }
  if (typeof process !== "undefined" && process.env && typeof process.env[key] === "string") {
    const val = process.env[key]!.trim()
    if (val.length > 0) return val
  }
  return undefined
}

function isDevEnvironment(): boolean {
  try {
    return Boolean(import.meta.env?.DEV)
  } catch {
    return typeof process !== "undefined" && process.env?.NODE_ENV !== "production"
  }
}

export function resolveAuthConfig(locals?: unknown): AuthConfig {
  const runtimeEnv = getRuntimeEnv(locals)
  const email = (readEnvString(runtimeEnv, "ADMIN_EMAIL") || DEFAULT_ADMIN_EMAIL).toLowerCase()
  const envPassword = readEnvString(runtimeEnv, "ADMIN_PASSWORD")
  const envSecret = readEnvString(runtimeEnv, "ADMIN_SESSION_SECRET")

  if (envPassword && envSecret) {
    return { configured: true, email, password: envPassword, secret: envSecret }
  }

  if (isDevEnvironment()) {
    if (!devWarningLogged && (!envPassword || !envSecret)) {
      devWarningLogged = true
      console.warn(
        "[AUTH] Variables ADMIN_PASSWORD / ADMIN_SESSION_SECRET no definidas; usando configuración local solo para desarrollo."
      )
    }
    return {
      configured: true,
      email,
      password: envPassword || DEV_FALLBACK_PASSWORD,
      secret: envSecret || DEV_FALLBACK_SECRET,
    }
  }

  return {
    configured: false,
    email,
    password: "",
    secret: "",
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToBytes(input: string): Uint8Array | null {
  try {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return null
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

async function sha256(value: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", encoded)
  return new Uint8Array(digest)
}

export async function verifyPassword(candidate: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(candidate), sha256(expected)])
  return timingSafeEqual(a, b)
}

async function signHmac(data: string, secret: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data))
  return new Uint8Array(sig)
}

export async function createSessionToken(email: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: AdminSession = {
    email,
    role: "admin",
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  }
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const sigBytes = await signHmac(payloadB64, secret)
  const sigB64 = bytesToBase64Url(sigBytes)
  return `${payloadB64}.${sigB64}`
}

export async function verifySessionToken(token: string, secret: string): Promise<AdminSession | null> {
  const parts = token.split(".")
  if (parts.length !== 2) return null

  const [payloadB64, sigB64] = parts
  const providedSig = base64UrlToBytes(sigB64)
  if (!providedSig) return null

  const expectedSig = await signHmac(payloadB64, secret)
  if (!timingSafeEqual(providedSig, expectedSig)) return null

  const payloadBytes = base64UrlToBytes(payloadB64)
  if (!payloadBytes) return null

  try {
    const parsed = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<AdminSession>
    const now = Math.floor(Date.now() / 1000)
    if (
      typeof parsed.email !== "string" ||
      parsed.role !== "admin" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= now
    ) {
      return null
    }
    return {
      email: parsed.email,
      role: "admin",
      iat: typeof parsed.iat === "number" ? parsed.iat : 0,
      exp: parsed.exp,
    }
  } catch {
    return null
  }
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!cookieHeader) return out
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=")
    if (eqIdx <= 0) continue
    const key = part.slice(0, eqIdx).trim()
    const val = part.slice(eqIdx + 1).trim()
    out[key] = decodeURIComponent(val)
  }
  return out
}

function isSecureRequest(request: Request): boolean {
  try {
    return new URL(request.url).protocol === "https:"
  } catch {
    return false
  }
}

export function buildSessionCookieHeader(token: string, request: Request): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ]
  if (isSecureRequest(request)) {
    parts.push("Secure")
  }
  return parts.join("; ")
}

export function buildClearSessionCookieHeader(request: Request): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
  ]
  if (isSecureRequest(request)) {
    parts.push("Secure")
  }
  return parts.join("; ")
}

export async function getAdminSession(request: Request, locals?: unknown): Promise<AdminSession | null> {
  const config = resolveAuthConfig(locals)
  if (!config.configured) return null

  const cookies = parseCookies(request.headers.get("cookie"))
  const token = cookies[ADMIN_SESSION_COOKIE]
  if (!token) return null

  return verifySessionToken(token, config.secret)
}

export async function requireAdmin(
  request: Request,
  locals?: unknown
): Promise<{ session: AdminSession } | { response: Response }> {
  const session = await getAdminSession(request, locals)
  if (!session) {
    return {
      response: new Response(
        JSON.stringify({
          success: false,
          message: "No autorizado. Inicia sesión como administrador.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      ),
    }
  }
  return { session }
}
