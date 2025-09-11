// Zoom Cloud Recordings Poller (cron fallback)
// Lista grabaciones/transcripts por rango de fechas para un usuario y registra/upserta sesiones

import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:integrations:zoom:poller")

function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization") || ""
  const secret = process.env.CRON_SECRET
  if (!secret) return true // permitir en desarrollo si no está configurado
  return authHeader === `Bearer ${secret}`
}

function toDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

async function getZoomAccessToken() {
  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom OAuth (Server-to-Server) no configurado: ZOOM_ACCOUNT_ID/ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET")
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Zoom token error: ${res.status} ${res.statusText} ${text}`)
  }
  const json = await res.json()
  return json?.access_token as string
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const url = new URL(req.url)
    const userId = process.env.ZOOM_USER_ID || url.searchParams.get("userId") || "me"
    const fromParam = url.searchParams.get("from")
    const toParam = url.searchParams.get("to")
    const pageParam = url.searchParams.get("page_size")
    const pageSize = Math.min(Math.max(parseInt(pageParam || "30", 10) || 30, 1), 300)

    const now = new Date()
    const to = toParam ? new Date(toParam) : now
    const from = fromParam ? new Date(fromParam) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: "Parámetros 'from' o 'to' inválidos" }, { status: 400 })
    }

    const token = await getZoomAccessToken()
    const apiUrl = new URL(`https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/recordings`)
    apiUrl.searchParams.set("from", toDateOnly(from))
    apiUrl.searchParams.set("to", toDateOnly(to))
    apiUrl.searchParams.set("page_size", String(pageSize))

    const res = await fetch(apiUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Zoom recordings error: ${res.status} ${res.statusText} ${text}`)
    }
    const data = await res.json()
    const meetings = data?.meetings || []

    const { db } = await connectToDatabase()
    let inserted = 0
    for (const m of meetings) {
      const result = await db.collection("consultation_sessions").updateOne(
        { provider: "zoom", uuid: m.uuid },
        {
          $setOnInsert: { createdAt: new Date() },
          $set: {
            provider: "zoom",
            uuid: m.uuid,
            meetingId: m.id,
            topic: m.topic,
            startTime: m.start_time,
            timezone: m.timezone,
            totalSize: m.total_size,
            recordingCount: m.recording_count,
            recordingFiles: m.recording_files || [],
            status: "recording_listed",
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      )
      if (result.upsertedCount > 0) inserted += 1
    }

    logger.info("Zoom poller", { found: meetings.length, inserted })
    return NextResponse.json({ success: true, found: meetings.length, inserted })
  } catch (error: any) {
    logger.error("Zoom poller error", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}

