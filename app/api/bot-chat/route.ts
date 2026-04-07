import { NextRequest, NextResponse } from "next/server";
import { callWithFallback } from "@/lib/llmChain";

const SYSTEM_PROMPT = `You are the VidCognify AI Assistant, designed to help visitors understand the VidCognify platform.
VidCognify is an AI-powered YouTube intelligence platform that features:
- Chapter-based YouTube video summaries.
- Transcript extraction and sentiment analysis.
- Multi-lingual support (50+ languages, including Hindi).
- Interactive Video Chat (ask questions directly about any video).
- Video Comparison (analyze two videos side-by-side).
- Auto Quiz Generator (5 multiple-choice questions per video).
- Structured Study Notes generation.
- A "Bring Your Own Key" (BYOK) system for Groq and OpenAI API keys.
- Free to start.

Rules:
1. Answer concisely (2-4 sentences max).
2. Be friendly, welcoming, and helpful.
3. If users ask something unrelated to VidCognify, gently guide them back to the platform.
4. Do not hallucinate features we don't have.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Format conversation history
    let historyText = "";
    if (history.length > 0) {
      historyText = "Conversation History:\n" + history.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join("\n") + "\n\n";
    }

    const fullPrompt = `${historyText}User Question: ${message}\n\nPlease respond based on the system instructions.`;

    const result = await callWithFallback(fullPrompt, {
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 300,
      temperature: 0.5,
    });

    return NextResponse.json({ answer: result.response });
  } catch (error) {
    console.error("Bot chat error:", error);
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
  }
}
