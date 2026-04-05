import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/apiAuth";
import { extractVideoId } from "@/lib/youtube";
import { callWithFallback } from "@/lib/llmChain";

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correct: "A" | "B" | "C" | "D";
}

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

    // Decode base64-encoded videoUrl if needed (same pattern as chat route)
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

    // Fetch stored transcript from DB (same as chat route)
    const summary = await prisma.summary.findFirst({
      where: { videoId, userId },
    });

    if (!summary || !summary.transcript) {
      return NextResponse.json(
        { error: "Transcript not found. Please generate a summary first." },
        { status: 404 }
      );
    }

    // Truncate transcript to 4000 characters
    const transcript = summary.transcript.slice(0, 4000);

    const systemPrompt = `You are a quiz generator. Given a video transcript, generate exactly 5 multiple choice questions that test understanding of the key concepts discussed.

STRICT OUTPUT FORMAT - respond with ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "question": "Question text here?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correct": "A"
  }
]

Rules:
- Exactly 5 questions
- Each question has exactly 4 options in the options array (index 0=A, 1=B, 2=C, 3=D)
- "correct" field is exactly one of: "A", "B", "C", or "D"
- Questions must be based strictly on the transcript content
- Make distractors plausible but clearly wrong
- Output ONLY the JSON array, nothing else`;

    const userPrompt = `Generate 5 multiple choice quiz questions based on this video transcript:\n\n${transcript}`;

    let result;
    try {
      result = await callWithFallback(userPrompt, {
        systemPrompt,
        maxTokens: 2048,
        temperature: 0.4,
        userId,
      });
    } catch (llmError) {
      // Retry once on 429 rate-limit errors after a 5-second delay
      const errMsg = llmError instanceof Error ? llmError.message : String(llmError);
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        result = await callWithFallback(userPrompt, {
          systemPrompt,
          maxTokens: 2048,
          temperature: 0.4,
          userId,
        });
      } else {
        throw llmError;
      }
    }

    // Parse and validate the response
    let rawText = result.response.trim();

    // Strip markdown code fences if present
    rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    // Extract JSON array
    const jsonStart = rawText.indexOf("[");
    const jsonEnd = rawText.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json(
        { error: "Failed to parse quiz questions from AI response" },
        { status: 500 }
      );
    }

    const jsonStr = rawText.slice(jsonStart, jsonEnd + 1);
    const questions: QuizQuestion[] = JSON.parse(jsonStr);

    // Validate structure
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "Invalid quiz format returned by AI" },
        { status: 500 }
      );
    }

    const validCorrect = new Set(["A", "B", "C", "D"]);
    const validated = questions.slice(0, 5).map((q) => ({
      question: String(q.question || ""),
      options: [
        String((q.options?.[0]) ?? ""),
        String((q.options?.[1]) ?? ""),
        String((q.options?.[2]) ?? ""),
        String((q.options?.[3]) ?? ""),
      ] as [string, string, string, string],
      correct: validCorrect.has(q.correct) ? q.correct : "A",
    }));

    return NextResponse.json({ questions: validated });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
