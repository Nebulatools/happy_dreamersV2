// Proxy-download a Zoom transcript file and return plain text (admin only)
// Query: meetingId|uuid, fileId

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getZoomAccessToken } from "@/lib/integrations/zoom"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const url = new URL(req.url)
    const meetingId = url.searchParams.get("meetingId")
    const uuid = url.searchParams.get("uuid")
    const fileId = url.searchParams.get("fileId")
    if ((!meetingId && !uuid) || !fileId) {
      return NextResponse.json({ error: "meetingId o uuid y fileId requeridos" }, { status: 400 })
    }

    const token = await getZoomAccessToken()
    const idForPath = meetingId || uuid
    const recUrl = `https://api.zoom.us/v2/meetings/${encodeURIComponent(String(idForPath))}/recordings`
    const res = await fetch(recUrl, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return NextResponse.json({ error: `Zoom recordings fetch failed: ${res.status}`, body: text?.slice(0, 500) }, { status: 502 })
    }
    const data = await res.json()
    const files = Array.isArray(data?.recording_files) ? data.recording_files : []
    const f = files.find((x: any) => String(x.id) === String(fileId))
    if (!f?.download_url) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }
    const dl = await fetch(f.download_url, { headers: { Authorization: `Bearer ${token}` } })
    if (!dl.ok) {
      const text = await dl.text().catch(() => "")
      return NextResponse.json({ error: `Download failed: ${dl.status}`, body: text?.slice(0, 500) }, { status: 502 })
    }
    const buf = await dl.arrayBuffer()
    const txt = new TextDecoder("utf-8").decode(buf)
    return new NextResponse(txt, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 })
  }
}

