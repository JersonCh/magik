import type { APIRoute } from "astro"
import { buildClearSessionCookieHeader } from "../../../lib/auth/adminSession"

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  return new Response(
    JSON.stringify({ success: true, message: "Sesión cerrada correctamente" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": buildClearSessionCookieHeader(request),
      },
    }
  )
}
