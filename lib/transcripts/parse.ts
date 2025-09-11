// Transcript parsing utilities (sketch)

export function parseVTTToPlainText(vtt: string): string {
  if (!vtt) return ""
  // Remove WEBVTT header and cue timestamps → keep text lines
  return vtt
    .split(/\r?\n/)
    .filter((line) => {
      // Skip timestamps (e.g., 00:00:00.000 --> 00:00:03.000) and cue numbers
      return !/^\d+$/.test(line.trim()) && !/-->/.test(line) && line.trim() !== "WEBVTT"
    })
    .join("\n")
    .trim()
}

export function parseGoogleDocText(text: string): string {
  // Basic cleanup for Google Doc exported as TXT
  return (text || "").replace(/\u00A0/g, " ").trim()
}

