// List all Zoom transcript files within a date range (admin only)
// Query: from=YYYY-MM-DD&to=YYYY-MM-DD&userId=<zoomUserId|me>&page_size=30

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

function isTranscriptFile(file: any): boolean {
  const type = (file?.file_type || "").toUpperCase()
  const ext = (file?.file_extension || "").toUpperCase()
  const recordingType = (file?.recording_type || "").toUpperCase()
  return type === "TRANSCRIPT" || ext === "VTT" || ext === "TXT" || recordingType === "TRANSCRIPT"
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const url = new URL(req.url)
    const userId = url.searchParams.get("userId") || process.env.ZOOM_USER_ID || "me"
    const pageParam = url.searchParams.get("page_size")
    const pageSize = Math.min(Math.max(parseInt(pageParam || "30", 10) || 30, 1), 300)
    const fromParam = url.searchParams.get("from")
    const toParam = url.searchParams.get("to")

    const now = new Date()
    const to = toParam ? new Date(toParam) : now
    const from = fromParam ? new Date(fromParam) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: "Parámetros 'from' o 'to' inválidos" }, { status: 400 })
    }

    const token = await getZoomAccessToken()
    const apiUrl = new URL(`https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/recordings`)
    apiUrl.searchParams.set("from", toDateOnly(from))
    apiUrl.searchParams.set("to", toDateOnly(to))
    apiUrl.searchParams.set("page_size", String(pageSize))

    const res = await fetch(apiUrl.toString(), { headers: { Authorization: `Bearer ${token}` } })
    const status = res.status
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return NextResponse.json({ error: `Zoom recordings error: ${status}`, body: text?.slice(0, 500) }, { status: 502 })
    }
    const data = await res.json()
    const meetings = data?.meetings || []

    // Flatten transcript files
    const items: any[] = []
    for (const m of meetings) {
      const recFiles = Array.isArray(m.recording_files) ? m.recording_files : []
      for (const f of recFiles) {
        if (isTranscriptFile(f)) {
          items.push({
            meetingId: m.id,
            uuid: m.uuid,
            topic: m.topic,
            startTime: m.start_time,
            timezone: m.timezone,
            file: {
              id: f.id,
              fileType: f.file_type,
              fileExtension: f.file_extension,
              recordingType: f.recording_type,
              status: f.status,
            },
          })
        }
      }
    }

    return NextResponse.json({ success: true, count: items.length, items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 })
  }
}

