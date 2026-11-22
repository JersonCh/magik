import type { APIRoute } from "astro"
import {
  buildSessionCookieHeader,
  createSessionToken,
  getAdminSession,
  resolveAuthConfig,
  verifyPassword,
} from "../../../lib/auth/adminSession"

export const prerender = false

const NO_STORE_JSON = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
}

export const GET: APIRoute = async ({ request, locals }) => {
  const session = await getAdminSession(request, locals)
  if (!session) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 401, headers: NO_STORE_JSON }
    )
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      user: { email: session.email, role: session.role, name: "Administrador Magik" },
    }),
    { status: 200, headers: NO_STORE_JSON }
  )
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const authConfig = resolveAuthConfig(locals)
    if (!authConfig.configured) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "La autenticación administrativa no está configurada en el servidor.",
        }),
        { status: 503, headers: NO_STORE_JSON }
      )
    }

    let body: Record<string, unknown>
    try {
      const parsed = await request.json()
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return new Response(
          JSON.stringify({ success: false, message: "Formato de solicitud inválido." }),
          { status: 400, headers: NO_STORE_JSON }
        )
      }
      body = parsed as Record<string, unknown>
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "JSON inválido." }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, message: "Ingresa tu correo y contraseña." }),
        { status: 400, headers: NO_STORE_JSON }
      )
    }

    const passwordMatches = await verifyPassword(password, authConfig.password)
    if (email === authConfig.email && passwordMatches) {
      const token = await createSessionToken(email, authConfig.secret)
      return new Response(
        JSON.stringify({
          success: true,
          user: { email, role: "admin", name: "Administrador Magik" },
        }),
        {
          status: 200,
          headers: {
            ...NO_STORE_JSON,
            "Set-Cookie": buildSessionCookieHeader(token, request),
          },
        }
      )
    }

    return new Response(
      JSON.stringify({ success: false, message: "Credenciales incorrectas." }),
      { status: 401, headers: NO_STORE_JSON }
    )
  } catch (error) {
    console.error("[API] Error en /api/admin/auth:", error)
    return new Response(
      JSON.stringify({ success: false, message: "Error interno en autenticación." }),
      { status: 500, headers: NO_STORE_JSON }
    )
  }
}
