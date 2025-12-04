// Zoom integration helpers: token, transcript download, and ingestion

import { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { createLogger } from "@/lib/logger"
import { ObjectId } from "mongodb"
import { parseVTTToPlainText } from "@/lib/transcripts/parse"
import { analyzeTranscriptLLM } from "@/lib/transcripts/analyze"

const logger = createLogger("lib:integrations:zoom")

// Acquire Zoom Server-to-Server OAuth access token
export async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom OAuth S2S no configurado (ZOOM_ACCOUNT_ID/ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET)")
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

// Determine if a recording file is a transcript-like file
function isTranscriptFile(file: any): boolean {
  const type = (file?.file_type || "").toUpperCase()
  const ext = (file?.file_extension || "").toUpperCase()
  const recordingType = (file?.recording_type || "").toUpperCase()
  // Zoom can mark transcripts as file_type TRANSCRIPT with extension VTT or TXT
  // Be permissive: accept TRANSCRIPT type or VTT/TXT extensions
  return type === "TRANSCRIPT" || ext === "VTT" || ext === "TXT" || recordingType === "TRANSCRIPT"
}

// Download a text resource from Zoom using the API download_url
async function downloadZoomText(downloadUrl: string, accessToken: string): Promise<string> {
  // Prefer Authorization header (safer than appending token query param)
  const res = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Zoom download failed: ${res.status} ${res.statusText} ${text}`)
  }
  const buf = await res.arrayBuffer()
  // Attempt to decode as UTF-8 text
  const decoder = new TextDecoder("utf-8")
  return decoder.decode(buf)
}

// Extract linking hints from meeting topic. Supported patterns:
// [HD child:<mongoId>] [HD user:<mongoId>]
export function extractLinkingFromTopic(topic?: string): { childId?: string; userId?: string } {
  const result: { childId?: string; userId?: string } = {}
  if (!topic) return result
  try {
    const childMatch = topic.match(/\[HD\s+child:([a-f0-9]{24})\]/i)
    const userMatch = topic.match(/\[HD\s+user:([a-f0-9]{24})\]/i)
    if (childMatch) result.childId = childMatch[1]
    if (userMatch) result.userId = userMatch[1]
  } catch {}
  return result
}

// Core ingestion: given a meeting (by meetingId or uuid), fetch recordings, download transcript,
// analyze and store consultation_report. Attempts to link to child/user.
export async function ingestZoomMeetingTranscripts(opts: {
  meetingId?: string | number
  uuid?: string
  topic?: string
  fallbackChildId?: string
  fallbackUserId?: string
}): Promise<{ processed: boolean; reportId?: string; linked: boolean; reason?: string }> {
  const { meetingId, uuid, topic, fallbackChildId, fallbackUserId } = opts
  if (!meetingId && !uuid) {
    return { processed: false, linked: false, reason: "meetingId o uuid requerido" }
  }

  const accessToken = await getZoomAccessToken()
  // Prefer meetingId endpoint, fallback to uuid if provided
  const idForPath = meetingId || uuid
  const recordingsUrl = `https://api.zoom.us/v2/meetings/${encodeURIComponent(String(idForPath))}/recordings`

  const recRes = await fetch(recordingsUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!recRes.ok) {
    const text = await recRes.text().catch(() => "")
    throw new Error(`Zoom recordings fetch failed: ${recRes.status} ${recRes.statusText} ${text}`)
  }
  const recData = await recRes.json()
  const recordingFiles = recData?.recording_files || []
  const recTopic = recData?.topic || topic || ""
  const recUuid = recData?.uuid || uuid || ""
  const recMeetingId = recData?.id || meetingId || ""

  // Find an unprocessed session for this uuid/meeting
  const { db } = await connectToDatabase()
  const sessionQuery: any = { provider: "zoom" }
  if (recUuid) sessionQuery.uuid = recUuid
  if (recMeetingId) sessionQuery.meetingId = recMeetingId
  const existingSession = await db.collection("consultation_sessions").findOne(sessionQuery)

  if (existingSession?.transcriptProcessed && existingSession?.reportId) {
    return { processed: true, linked: true, reportId: String(existingSession.reportId) }
  }

  const transcriptFile = recordingFiles.find((f: any) => isTranscriptFile(f))
  if (!transcriptFile) {
    // No transcript available yet
    await db.collection("consultation_sessions").updateOne(sessionQuery, {
      $set: {
        provider: "zoom",
        uuid: recUuid,
        meetingId: recMeetingId,
        topic: recTopic,
        status: "recording_listed_no_transcript",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    }, { upsert: true })
    return { processed: false, linked: false, reason: "no_transcript_file" }
  }

  // Download transcript
  const raw = await downloadZoomText(transcriptFile.download_url, accessToken)
  // Try to parse VTT first; if parsing results in empty, fallback to raw
  const parsed = parseVTTToPlainText(raw)
  const transcriptText = parsed?.trim() ? parsed : (raw || "")

  // Linking strategy
  let linkUserId = fallbackUserId
  let linkChildId = fallbackChildId

  if (!linkUserId || !linkChildId) {
    const hints = extractLinkingFromTopic(recTopic)
    linkUserId = linkUserId || hints.userId
    linkChildId = linkChildId || hints.childId
  }

  if (!linkUserId || !linkChildId) {
    // Try session doc
    if (existingSession?.userId && existingSession?.childId) {
      linkUserId = linkUserId || String(existingSession.userId)
      linkChildId = linkChildId || String(existingSession.childId)
    }
  }

  // Analyze
  const model = process.env.GEMINI_API_KEY ? "gemini" : "openai"
  const analysis = await analyzeTranscriptLLM(transcriptText, model as any)

  if (linkUserId && linkChildId) {
    // Create linked report
    const ins = await db.collection("consultation_reports").insertOne({
      childId: new ObjectId(linkChildId),
      userId: new ObjectId(linkUserId),
      provider: "zoom",
      transcript: transcriptText,
      analysis: analysis?.summary || "",
      recommendations: analysis?.recommendations || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      source: {
        zoom: {
          meetingId: recMeetingId,
          uuid: recUuid,
          fileId: transcriptFile.id,
          fileType: transcriptFile.file_type,
          fileExtension: transcriptFile.file_extension,
        },
      },
    })

    await db.collection("consultation_sessions").updateOne(sessionQuery, {
      $set: {
        provider: "zoom",
        uuid: recUuid,
        meetingId: recMeetingId,
        topic: recTopic,
        transcriptProcessed: true,
        reportId: ins.insertedId,
        status: "transcript_processed",
        updatedAt: new Date(),
        userId: new ObjectId(linkUserId),
        childId: new ObjectId(linkChildId),
      },
      $setOnInsert: { createdAt: new Date() },
    }, { upsert: true })

    return { processed: true, reportId: String(ins.insertedId), linked: true }
  }

  // If we cannot link, store on session for later reconciliation
  await db.collection("consultation_sessions").updateOne(sessionQuery, {
    $set: {
      provider: "zoom",
      uuid: recUuid,
      meetingId: recMeetingId,
      topic: recTopic,
      transcriptProcessed: true,
      status: "transcript_unlinked",
      transcriptText,
      updatedAt: new Date(),
    },
    $setOnInsert: { createdAt: new Date() },
  }, { upsert: true })

  return { processed: true, linked: false, reason: "unlinked_no_child_or_user" }
}

