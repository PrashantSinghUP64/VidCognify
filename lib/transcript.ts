import { extractVideoId } from "./youtube"

/**
 * Transcript segment with timestamp information
 */
export interface TranscriptSegment {
  text: string
  offset: number // Start time in milliseconds
  duration: number // Duration in milliseconds
  lang: string
}

/**
 * Structured transcript result
 */
export interface TranscriptResult {
  content: TranscriptSegment[] | string
  lang: string
  availableLangs: string[]
  hasTimestamps: boolean
}

/**
 * Error thrown when transcript fetching fails
 */
export class TranscriptError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = "TranscriptError"
  }
}

/**
 * Fetches transcript for a YouTube video URL using Supadata API.
 *
 * @param videoUrl - The YouTube video URL or ID
 * @returns Structured transcript with content, language info, and timestamp indicator
 * @throws TranscriptError if fails
 */
export async function fetchTranscript(videoUrl: string): Promise<TranscriptResult> {
  let videoId: string
  try {
    videoId = extractVideoId(videoUrl)
  } catch {
    throw new TranscriptError("Invalid YouTube URL. Could not extract video ID.", "INVALID_URL")
  }

  try {
    const response = await fetch(
      `https://api.supadata.ai/v1/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}&text=false`,
      {
        headers: {
          "x-api-key": process.env.SUPADATA_API_KEY || "",
        },
      },
    )

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new TranscriptError("Invalid or missing Supadata API Key. Please check your .env file.", "AUTH_ERROR")
      }
      throw new Error("Transcript not available")
    }

    const data = await response.json()

    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      throw new Error("Empty transcript returned")
    }

    const segments: TranscriptSegment[] = data.content.map((item: any) => ({
      text: item.text,
      offset: item.offset,
      duration: item.duration,
      lang: "en",
    }))

    return {
      content: segments,
      lang: "en",
      availableLangs: ["en"],
      hasTimestamps: true,
    }
  } catch (e: any) {
    if (e instanceof TranscriptError) {
      throw e
    }
    console.error("[transcript] Supadata API fetch failed:", e)
    throw new TranscriptError(
      "No transcript available for this video. The video may not have captions, or YouTube is rate-limiting this server. Try again later or use a different video.",
      "NO_TRANSCRIPT",
    )
  }
}
