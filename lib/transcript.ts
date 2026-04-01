import { Innertube } from "youtubei.js";
import { extractVideoId } from "./youtube";

/**
 * Transcript segment with timestamp information
 */
export interface TranscriptSegment {
  text: string;
  offset: number; // Start time in milliseconds
  duration: number; // Duration in milliseconds
  lang: string;
}

/**
 * Structured transcript result
 */
export interface TranscriptResult {
  content: TranscriptSegment[] | string;
  lang: string;
  availableLangs: string[];
  hasTimestamps: boolean;
}

/**
 * Error thrown when transcript fetching fails
 */
export class TranscriptError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "TranscriptError";
  }
}

/** Singleton Innertube instance (initialised once per process) */
let _innertube: Innertube | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!_innertube) {
    _innertube = await Innertube.create({
      lang: "en",
      location: "US",
      retrieve_player: false,
      generate_session_locally: true,
    });
  }
  return _innertube;
}

/**
 * Helper to safely extract a JSON object from HTML using a start marker
 * (brace-balanced, handles nested objects and strings with escapes)
 */
function extractJSON(text: string, startMatch: string): any {
  const startIndex = text.indexOf(startMatch);
  if (startIndex === -1) return null;
  const jsonStart = startIndex + startMatch.length;
  let braces = 0;
  let inString = false;
  let escaped = false;
  for (let i = jsonStart; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === "\\") escaped = !escaped;
      else if (char === '"' && !escaped) inString = false;
      else escaped = false;
    } else {
      if (char === '"') inString = true;
      else if (char === "{") braces++;
      else if (char === "}") {
        braces--;
        if (braces === 0) {
          try { return JSON.parse(text.substring(jsonStart, i + 1)); } catch { return null; }
        }
      }
    }
  }
  return null;
}

/**
 * Extracts the captionTracks array from an HTML page
 */
function extractCaptionTracks(html: string): any[] | null {
  const marker = '"captionTracks":';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const arrayStart = html.indexOf("[", idx + marker.length);
  if (arrayStart === -1) return null;
  let braces = 0;
  let inStr = false;
  let esc = false;
  for (let i = arrayStart; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (c === "\\" && !esc) esc = true;
      else if (c === '"' && !esc) inStr = false;
      else esc = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === "[" || c === "{") braces++;
      else if (c === "]" || c === "}") {
        braces--;
        if (braces === 0) {
          try { return JSON.parse(html.substring(arrayStart, i + 1)); } catch { return null; }
        }
      }
    }
  }
  return null;
}

/**
 * Formats JSON3 transcript events into our standard format.
 * json3 events look like: { tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: "hello" }] }
 */
function formatJSON3Events(events: any[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  for (const event of events) {
    if (!event.segs?.length) continue;
    const text = event.segs.map((s: any) => s.utf8 ?? "").join("").trim();
    if (!text || text === "\n") continue;
    segments.push({
      text,
      offset: event.tStartMs ?? 0,
      duration: event.dDurationMs ?? 0,
      lang: "en",
    });
  }
  return segments;
}

/**
 * Parses XML timedtext format into transcript segments
 */
function parseXMLTranscript(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = match[3]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!text) continue;
    segments.push({
      text,
      offset: Math.round(parseFloat(match[1]) * 1000),
      duration: Math.round(parseFloat(match[2]) * 1000),
      lang: "en",
    });
  }
  return segments;
}

/**
 * Formats youtubei.js `getTranscript()` initial_segments into our format
 */
function formatInnertubseSegments(initialSegments: any[]): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  for (const seg of initialSegments) {
    const renderer = (seg as any).transcript_segment;
    if (!renderer) continue;
    const snippets = renderer.snippet?.runs;
    if (!snippets?.length) continue;
    const text = snippets.map((r: any) => r.text ?? "").join("").trim();
    if (!text) continue;
    // start_time_text / end_time_text from youtubei.js are "0:01" style strings
    // The actual raw times are in the underlying data - use offset from text if available
    segments.push({
      text,
      offset: renderer.start_ms ? Number(renderer.start_ms) : 0,
      duration: renderer.end_ms ? Number(renderer.end_ms) - Number(renderer.start_ms) : 0,
      lang: "en",
    });
  }
  return segments;
}

/**
 * Strategy 1: Use youtubei.js Innertube to call the get_transcript API
 */
async function fetchViaInnertube(videoId: string): Promise<TranscriptSegment[] | null> {
  try {
    const youtube = await getInnertube();
    const info = await youtube.getInfo(videoId);
    const transcriptData = await info.getTranscript();
    const initialSegments =
      transcriptData?.transcript?.content?.body?.initial_segments;
    if (!initialSegments?.length) return null;
    const segs = formatInnertubseSegments(initialSegments);
    return segs.length > 0 ? segs : null;
  } catch (e) {
    console.warn("[transcript] Innertube getTranscript failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Strategy 2: Scrape watch page, get signed caption URL, fetch XML timedtext
 */
async function fetchViaPageScrape(videoId: string): Promise<{ segments: TranscriptSegment[]; lang: string } | null> {
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!pageRes.ok) return null;

    const html = await pageRes.text();
    const captionTracks = extractCaptionTracks(html);
    if (!captionTracks?.length) return null;

    // Prefer non-auto-generated English, then auto English, then first available
    const track =
      captionTracks.find((t: any) => t.languageCode === "en" && t.kind !== "asr") ||
      captionTracks.find((t: any) => t.languageCode === "en") ||
      captionTracks[0];

    if (!track?.baseUrl) return null;

    const lang: string = track.languageCode ?? "en";

    // Try XML format first (more reliably available than json3 from server IPs)
    for (const fmt of ["xml", "json3"] as const) {
      try {
        const captionUrl = track.baseUrl + `&fmt=${fmt}`;
        const capsRes = await fetch(captionUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: pageUrl,
          },
        });
        if (!capsRes.ok) continue;

        const body = await capsRes.text();
        if (!body || body.trim().length < 10) continue;

        let segments: TranscriptSegment[];
        if (fmt === "xml") {
          segments = parseXMLTranscript(body);
        } else {
          const data = JSON.parse(body);
          segments = formatJSON3Events(data.events ?? []);
        }

        if (segments.length > 0) return { segments, lang };
      } catch {
        continue;
      }
    }

    return null;
  } catch (e) {
    console.warn("[transcript] Page scrape failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Strategy 3: Use youtubei.js captions.caption_tracks signed URL with XML fallback
 * (bypasses the get_transcript API entirely)
 */
async function fetchViaInnertubeSignedUrl(videoId: string): Promise<{ segments: TranscriptSegment[]; lang: string } | null> {
  try {
    const youtube = await getInnertube();
    const info = await youtube.getInfo(videoId);
    const captionTracks = info?.captions?.caption_tracks as any[] | undefined;
    if (!captionTracks?.length) return null;

    const track =
      captionTracks.find((t: any) => t.language_code === "en" && t.kind !== "asr") ||
      captionTracks.find((t: any) => t.language_code === "en") ||
      captionTracks[0];

    if (!track?.base_url) return null;

    const lang: string = track.language_code ?? "en";
    const fetchFn: typeof fetch = youtube.session.http.fetch_function;

    for (const fmt of ["xml", "json3"] as const) {
      try {
        const captionUrl = track.base_url + `&fmt=${fmt}`;
        const response = await fetchFn(captionUrl, {
          headers: {
            "User-Agent": youtube.session.user_agent ?? "Mozilla/5.0",
            "X-Goog-Visitor-Id": youtube.session.context?.client?.visitorData ?? "",
            "Accept": "*/*",
          },
        });
        if (!response.ok) continue;

        const body = await response.text();
        if (!body || body.trim().length < 10) continue;

        let segments: TranscriptSegment[];
        if (fmt === "xml") {
          segments = parseXMLTranscript(body);
        } else {
          const data = JSON.parse(body);
          segments = formatJSON3Events(data.events ?? []);
        }

        if (segments.length > 0) return { segments, lang };
      } catch {
        continue;
      }
    }

    return null;
  } catch (e) {
    console.warn("[transcript] Innertube signed URL failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Fetches transcript for a YouTube video URL.
 *
 * Uses a 3-strategy cascade:
 *   1. youtubei.js Innertube get_transcript API (best, handles auth)
 *   2. Page scrape → signed caption URL → XML/JSON3
 *   3. youtubei.js getInfo caption_tracks → signed URL → XML/JSON3
 *
 * @param videoUrl - The YouTube video URL or ID
 * @returns Structured transcript with content, language info, and timestamp indicator
 * @throws TranscriptError if all strategies fail
 */
export async function fetchTranscript(
  videoUrl: string
): Promise<TranscriptResult> {
  let videoId: string;
  try {
    videoId = extractVideoId(videoUrl);
  } catch {
    throw new TranscriptError(
      "Invalid YouTube URL. Could not extract video ID.",
      "INVALID_URL"
    );
  }

  // Strategy 1: Innertube get_transcript
  const innertubeSegs = await fetchViaInnertube(videoId);
  if (innertubeSegs && innertubeSegs.length > 0) {
    return {
      content: innertubeSegs,
      lang: "en",
      availableLangs: ["en"],
      hasTimestamps: true,
    };
  }

  // Strategy 2: Page scrape → XML/JSON3
  const scraped = await fetchViaPageScrape(videoId);
  if (scraped && scraped.segments.length > 0) {
    return {
      content: scraped.segments,
      lang: scraped.lang,
      availableLangs: [scraped.lang],
      hasTimestamps: true,
    };
  }

  // Strategy 3: Innertube signed URL → XML/JSON3
  const signed = await fetchViaInnertubeSignedUrl(videoId);
  if (signed && signed.segments.length > 0) {
    return {
      content: signed.segments,
      lang: signed.lang,
      availableLangs: [signed.lang],
      hasTimestamps: true,
    };
  }

  throw new TranscriptError(
    "No transcript available for this video. The video may not have captions, or YouTube is rate-limiting this server. Try again later or use a different video.",
    "NO_TRANSCRIPT"
  );
}
