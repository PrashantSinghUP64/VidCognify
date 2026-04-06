import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/apiAuth";
import { extractVideoId } from "@/lib/youtube";
import { callWithFallback } from "@/lib/llmChain";

export async function POST(req: NextRequest) {
  // Authenticate
  const auth = await authenticateRequest(req);
  if (!auth.success) {
    return auth.response;
  }
  const userId = auth.userId;

  try {
    const { videoUrl } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
    }

    // Decode base64-encoded videoUrl if needed (same pattern as quiz/chat routes)
    let urlToExtract = videoUrl;
    if (
      !videoUrl.includes("youtube.com") &&
      !videoUrl.includes("youtu.be") &&
      videoUrl.length > 11
    ) {
      try {
        urlToExtract = Buffer.from(
          videoUrl.replace(/-/g, "+").replace(/_/g, "/"),
          "base64"
        ).toString("utf-8");
      } catch {
        // Fallback to original string
      }
    }

    // Extract video ID
    let videoId: string;
    try {
      videoId = extractVideoId(urlToExtract);
    } catch {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    // Fetch stored SUMMARY TEXT from DB (not transcript)
    const summaryRecord = await prisma.summary.findFirst({
      where: { videoId, userId },
      select: { content: true, title: true },
    });

    if (!summaryRecord || !summaryRecord.content) {
      return NextResponse.json(
        { error: "Summary not found. Please generate a summary first." },
        { status: 404 }
      );
    }

    const summaryText = summaryRecord.content;

    const systemPrompt = `You are an expert note-taker. Given a video summary, produce clean, structured study notes in markdown.

Output EXACTLY this format (no extra headings, no preamble):

## 📌 Key Concepts
- [concept 1]
- [concept 2]
- [concept 3]
- [concept 4]
- [concept 5]

## ✅ Main Takeaways
- [takeaway 1]
- [takeaway 2]
- [takeaway 3]
- [takeaway 4]
- [takeaway 5]

## 📖 Important Terms
- **[Term]**: [one-line definition]
- **[Term]**: [one-line definition]
- **[Term]**: [one-line definition]

Rules:
- Be concise and factual
- Base notes strictly on the provided summary
- Use plain bullet points, no sub-bullets
- Output ONLY the markdown above, nothing else`;

    const userPrompt = `Generate structured study notes from this video summary:\n\n${summaryText}`;

    let result;
    try {
      result = await callWithFallback(userPrompt, {
        systemPrompt,
        maxTokens: 800,
        temperature: 0.3,
        userId,
      });
    } catch (llmError) {
      // Retry once on 429 rate-limit errors after a 5-second delay
      const errMsg = llmError instanceof Error ? llmError.message : String(llmError);
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        result = await callWithFallback(userPrompt, {
          systemPrompt,
          maxTokens: 800,
          temperature: 0.3,
          userId,
        });
      } else {
        throw llmError;
      }
    }

    return NextResponse.json({ notes: result.response.trim() });
  } catch (error) {
    console.error("Notes generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate notes" },
      { status: 500 }
    );
  }
}
