// Transcript processing endpoint (sketch)
// Accepts provider + resource identifiers, fetches/normalizes transcript, analyzes, and stores report

import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { createLogger } from "@/lib/logger"
import { parseVTTToPlainText, parseGoogleDocText } from "@/lib/transcripts/parse"
import { analyzeTranscriptLLM } from "@/lib/transcripts/analyze"

const logger = createLogger("API:transcripts:process")

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, childId, userId, resource } = body || {}

    if (!provider || !childId || !userId) {
      return NextResponse.json({ error: "Missing provider, childId, or userId" }, { status: 400 })
    }

    // 1) Fetch raw transcript by provider (sketch: expects provided text for now)
    let rawText: string = ""
    if (provider === "zoom") {
      // Expect resource.vtt or resource.srt provided for first tests
      const vtt: string | undefined = resource?.vtt
      const srt: string | undefined = resource?.srt
      if (vtt) rawText = parseVTTToPlainText(vtt)
      else if (srt) rawText = srt
      else rawText = resource?.text || ""
    } else if (provider === "google") {
      // Expect resource.docText (Google Doc exported as txt) for first tests
      const docText: string | undefined = resource?.docText
      rawText = parseGoogleDocText(docText || "")
    } else {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 })
    }

    if (!rawText) {
      return NextResponse.json({ error: "No transcript content provided" }, { status: 400 })
    }

    // 2) Analyze transcript (Gemini/OpenAI - sketch)
    const analysis = await analyzeTranscriptLLM(rawText, process.env.GEMINI_API_KEY ? "gemini" : "openai")

    // 3) Store consultation report
    const { db } = await connectToDatabase()
    const report = await db.collection("consultation_reports").insertOne({
      childId: new ObjectId(childId),
      userId: new ObjectId(userId),
      provider,
      transcript: rawText,
      analysis: analysis?.summary || "",
      recommendations: analysis?.recommendations || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    logger.info("Transcript processed", { reportId: report.insertedId })

    return NextResponse.json({ success: true, reportId: report.insertedId })
  } catch (error: any) {
    logger.error("Transcript processing error", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}

