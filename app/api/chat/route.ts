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
    const { videoUrl, question, history = [] } = await req.json();

    if (!videoUrl || !question) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let urlToExtract = videoUrl;
    if (!videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be") && videoUrl.length > 11) {
      try {
        urlToExtract = Buffer.from(videoUrl.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
      } catch (e) {
        // Fallback to original string if decode fails
      }
    }

    let videoId;
    try {
      videoId = extractVideoId(urlToExtract);
    } catch (error) {
      return NextResponse.json({ error: "Invalid YouTube URL or ID" }, { status: 400 });
    }
    
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    // Fetch the transcript from DB
    const summary = await prisma.summary.findFirst({
      where: { videoId, userId }
    });

    if (!summary || !summary.transcript) {
      return NextResponse.json({ error: "Transcript not found for this video" }, { status: 404 });
    }

    const transcript = summary.transcript;
    let relevantChunk = transcript;

    // Chunking logic if greater than 3000 chars
    if (transcript.length > 3000) {
      const chunks = [];
      for (let i = 0; i < transcript.length; i += 3000) {
        chunks.push(transcript.slice(i, i + 3000));
      }

      // Simple keyword matching algorithm
      const keywords = question.toLowerCase().match(/\w{4,}/g) || question.toLowerCase().split(/\s+/);
      
      let bestScore = -1;
      for (const chunk of chunks) {
        let score = 0;
        const lowerChunk = chunk.toLowerCase();
        for (const kw of keywords) {
          if (lowerChunk.includes(kw)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          relevantChunk = chunk;
        }
      }
    }

    // Format conversation history
    let historyText = "";
    if (history.length > 0) {
      historyText = "Conversation History:\n" + history.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join("\n") + "\n\n";
    }

    const fullPrompt = `Here is the relevant transcript snippet from the video you are asked about:
---
${relevantChunk}
---

${historyText}User Question: ${question}

Answer the user's question concisely based ONLY on the provided transcript snippet. If the answer is not in the transcript snippet, say "I couldn't find the answer to that in the video." Do NOT make up information. Use a clean, helpful tone.`;

    const result = await callWithFallback(fullPrompt, {
      systemPrompt: "You are a helpful AI assistant integrated directly into VidCognify that answers questions about a specific video accurately based on the video transcript snippet.",
      maxTokens: 500,
      temperature: 0.5,
      userId,
    });

    return NextResponse.json({ answer: result.response });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
  }
}
