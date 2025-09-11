// Google Drive Poller (cron fallback)
// Busca archivos recientes por carpeta/fecha para detectar transcripts o grabaciones

import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { createLogger } from "@/lib/logger"

const logger = createLogger("API:integrations:google:drive:poller")

// Carga perezosa para evitar overhead si no se usa
async function getDriveClient() {
  const { google } = await import("googleapis")
  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL
  let privateKey = process.env.GOOGLE_SA_PRIVATE_KEY
  if (!clientEmail || !privateKey) {
    return null
  }
  // Corregir newline escapado
  privateKey = privateKey.replace(/\\n/g, "\n")
  const scopes = ["https://www.googleapis.com/auth/drive.readonly"]
  const auth = new google.auth.JWT(clientEmail, undefined as any, privateKey, scopes)
  const drive = google.drive({ version: "v3", auth })
  return drive
}

function verifyCronAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization") || ""
  const secret = process.env.CRON_SECRET
  if (!secret) return true // en dev permitir
  return authHeader === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const url = new URL(req.url)
    const folderId = url.searchParams.get("folderId") || undefined
    const sinceParam = url.searchParams.get("since")
    const limitParam = url.searchParams.get("limit")
    const limit = Math.min(Math.max(parseInt(limitParam || "25", 10) || 25, 1), 100)

    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 24 * 60 * 60 * 1000)
    if (isNaN(since.getTime())) {
      return NextResponse.json({ error: "Parámetro 'since' inválido" }, { status: 400 })
    }

    const drive = await getDriveClient()
    if (!drive) {
      return NextResponse.json({
        error: "Drive no configurado",
        details: "Define GOOGLE_SA_CLIENT_EMAIL y GOOGLE_SA_PRIVATE_KEY para habilitar el poller",
      }, { status: 501 })
    }

    // Query: archivos no eliminados, recientes, opcionalmente dentro de carpeta
    // Filtramos por tipos comunes: Google Doc (transcript) o MP4 (grabación)
    const mimeFilters = "(mimeType='application/vnd.google-apps.document' or mimeType='video/mp4')"
    const parentFilter = folderId ? ` and '${folderId}' in parents` : ""
    const q = `trashed=false and ${mimeFilters} and modifiedTime > '${since.toISOString()}'${parentFilter}`

    const res = await drive.files.list({
      q,
      pageSize: limit,
      orderBy: "modifiedTime desc",
      fields: "files(id,name,mimeType,modifiedTime,createdTime,parents,owners(emailAddress,displayName))",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })

    const files = res.data.files || []

    const { db } = await connectToDatabase()
    let inserted = 0
    for (const f of files) {
      // Upsert por fileId para evitar duplicados
      const result = await db.collection("consultation_sessions").updateOne(
        { provider: "google", driveFileId: f.id },
        {
          $setOnInsert: { createdAt: new Date() },
          $set: {
            provider: "google",
            driveFileId: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime,
            createdTime: f.createdTime,
            parents: f.parents || [],
            status: "drive_file_detected",
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      )
      if (result.upsertedCount > 0) inserted += 1
    }

    logger.info("Drive poller", { count: files.length, inserted })
    return NextResponse.json({ success: true, checked: files.length, inserted })
  } catch (error: any) {
    logger.error("Drive poller error", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}

