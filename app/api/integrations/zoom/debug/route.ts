// Debug endpoint to verify Zoom integration connectivity and permissions
// Returns non-sensitive diagnostics. Admin only.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getZoomAccessToken } from "@/lib/integrations/zoom"

function toDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const env = {
      ZOOM_ACCOUNT_ID: !!process.env.ZOOM_ACCOUNT_ID,
      ZOOM_CLIENT_ID: !!process.env.ZOOM_CLIENT_ID,
      ZOOM_CLIENT_SECRET: !!process.env.ZOOM_CLIENT_SECRET,
      ZOOM_WEBHOOK_SECRET: !!process.env.ZOOM_WEBHOOK_SECRET,
      ZOOM_USER_ID: process.env.ZOOM_USER_ID || null,
    }

    const diagnostics: any = { env }

    // Try to get S2S token
    try {
      const token = await getZoomAccessToken()
      diagnostics.token_ok = true
      diagnostics.token_preview = token ? `ok_${String(token).slice(0, 6)}…` : null
    } catch (e: any) {
      diagnostics.token_ok = false
      diagnostics.token_error = e?.message || String(e)
      return NextResponse.json({ success: false, diagnostics }, { status: 200 })
    }

    // Try a minimal API call to check scopes: list recordings for a short range
    const userId = process.env.ZOOM_USER_ID || "me"
    const now = new Date()
    const to = toDateOnly(now)
    const from = toDateOnly(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000))
    try {
      const token = await getZoomAccessToken()
      const url = new URL(`https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/recordings`)
      url.searchParams.set("from", from)
      url.searchParams.set("to", to)
      url.searchParams.set("page_size", "1")
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
      diagnostics.api_status = res.status
      if (res.ok) {
        const data = await res.json()
        diagnostics.api_ok = true
        diagnostics.recordings_found = Array.isArray(data?.meetings) ? data.meetings.length : 0
      } else {
        const text = await res.text().catch(() => "")
        diagnostics.api_ok = false
        diagnostics.api_error = `${res.status} ${res.statusText}`
        diagnostics.api_body = text?.slice(0, 300) || null
      }
    } catch (e: any) {
      diagnostics.api_ok = false
      diagnostics.api_error = e?.message || String(e)
    }

    return NextResponse.json({ success: true, diagnostics })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 })
  }
}

