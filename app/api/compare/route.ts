import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/apiAuth";
import { extractVideoId } from "@/lib/youtube";
import { callWithFallback } from "@/lib/llmChain";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.success) {
    return auth.response;
  }
  const userId = auth.userId;

  try {
    const { videoUrl1, videoUrl2 } = await req.json();
    console.log("Received:", { videoUrl1, videoUrl2 });

    if (!videoUrl1 || !videoUrl2) {
      return NextResponse.json({ error: "videoUrl1 and videoUrl2 are required" }, { status: 400 });
    }

    let urlToExtract1 = videoUrl1;
    let urlToExtract2 = videoUrl2;
    // Decode both URLs
    try {
      urlToExtract1 = Buffer.from(videoUrl1, 'base64').toString('utf-8');
    } catch {}
    try {
      urlToExtract2 = Buffer.from(videoUrl2, 'base64').toString('utf-8');
    } catch {}
    
    console.log("Decoded URL1:", urlToExtract1);
    console.log("Decoded URL2:", urlToExtract2);

    let videoId1: string;
    let videoId2: string;
    try {
      videoId1 = extractVideoId(urlToExtract1);
      videoId2 = extractVideoId(urlToExtract2);
    } catch {
      return NextResponse.json({ error: "Invalid YouTube URL provided" }, { status: 400 });
    }

    console.log("VideoID1:", videoId1);
    console.log("VideoID2:", videoId2);

    let [summary1, summary2] = await Promise.all([
      prisma.summary.findFirst({ where: { videoId: videoId1, userId } }),
      prisma.summary.findFirst({ where: { videoId: videoId2, userId } }),
    ]);

    if (!summary1 || !summary2) {
      console.log("Exact match failed for one or both. Fetching all summaries for fallback.");
      const allSummaries = await prisma.summary.findMany({ where: { userId } });
      console.log("All stored videoIds:", allSummaries.map(s => s.videoId));
      
      const cleanVideoId1 = videoId1.split('?')[0].split('&')[0];
      const cleanVideoId2 = videoId2.split('?')[0].split('&')[0];

      if (!summary1) {
        summary1 = allSummaries.find(s => 
          s.videoId.includes(videoId1) || videoId1.includes(s.videoId) ||
          s.videoId.includes(cleanVideoId1) || cleanVideoId1.includes(s.videoId)
        ) || null;
      }
      
      if (!summary2) {
        summary2 = allSummaries.find(s => 
          s.videoId.includes(videoId2) || videoId2.includes(s.videoId) ||
          s.videoId.includes(cleanVideoId2) || cleanVideoId2.includes(s.videoId)
        ) || null;
      }
    }

    console.log("Summary1 found:", !!summary1);
    console.log("Summary2 found:", !!summary2);

    if (!summary1) {
      return NextResponse.json(
        { error: "Summary not found for Video 1. Please generate its summary first." },
        { status: 404 }
      );
    }
    if (!summary2) {
      return NextResponse.json(
        { error: "Summary not found for Video 2. Please generate its summary first." },
        { status: 404 }
      );
    }

    const content1 = (summary1.content || "").slice(0, 1500);
    const content2 = (summary2.content || "").slice(0, 1500);

    const systemPrompt = `You are an expert content analyzer. Compare two video summaries and provide a structured comparison.
    
STRICT OUTPUT FORMAT - respond with ONLY a valid JSON object, no markdown, no explanation:
{
  "commonTopics": ["topic1", "topic2"],
  "video1Better": "one line what video 1 explains better",
  "video2Better": "one line what video 2 explains better",
  "winner": "video1 or video2",
  "reason": "one line why"
}

Rules:
- commonTopics: array of topics.
- video1Better: exactly 1 line.
- video2Better: exactly 1 line.
- winner: simple string.
- reason: exactly 1 line explaining why.
- Output ONLY the JSON object.`;

    const userPrompt = `Compare these two video summaries:

Video 1 Summary:
${content1}

Video 2 Summary:
${content2}`;

    let result;
    try {
      result = await callWithFallback(userPrompt, {
        systemPrompt,
        maxTokens: 500,
        temperature: 0.4,
        userId,
      });
    } catch (llmError) {
      const errMsg = llmError instanceof Error ? llmError.message : String(llmError);
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        result = await callWithFallback(userPrompt, {
          systemPrompt,
          maxTokens: 500,
          temperature: 0.4,
          userId,
        });
      } else {
        throw llmError;
      }
    }

    let rawText = result.response.trim();
    rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    return new NextResponse(rawText, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Compare videos error:", error);
    return NextResponse.json(
      { error: "Failed to compare videos" },
      { status: 500 }
    );
  }
}
