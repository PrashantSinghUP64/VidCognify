import { callWithFallback } from "./llmChain";

export interface ExtractedMetrics {
  sentiment: string;
  difficulty: string;
  category: string;
}

export async function extractMetrics(
  transcript: string,
  summary: string,
  options: { userId?: string | null } = {}
): Promise<{ metrics: ExtractedMetrics; modelUsed: string; tokensUsed?: number }> {
    const systemPrompt = `You are an expert video content analyst. 
Analyze the provided video transcript and its summary to determine the following metrics:
1. Sentiment: The overall tone of the video. Must be exactly one of: "Positive", "Neutral", "Negative".
2. Difficulty: The complexity level of the subject matter. Must be exactly one of: "Beginner", "Intermediate", "Advanced".
3. Category: The main topic of the video. Must be exactly one of: "Machine Learning", "Web Dev", "Finance", "History", "Science", "Other".

You must return ONLY a raw JSON object string with no markdown formatting and no extra text.
The JSON must have this strict schema:
{
  "sentiment": "Positive" | "Neutral" | "Negative",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "category": "Machine Learning" | "Web Dev" | "Finance" | "History" | "Science" | "Other"
}`;

    const userPrompt = `Video Summary:
${summary}

Video Transcript snippet (first 10000 chars):
${transcript.substring(0, 10000)}

Output the JSON strictly.`;

    // Make the LLM call using our unified chain
    const aiResponse = await callWithFallback(userPrompt, {
      systemPrompt: systemPrompt,
      temperature: 0.1, // low temperature for consistent JSON
      maxTokens: 150,
      userId: options.userId ?? undefined,
    });

    try {
      // Clean up the response in case the LLM returned markdown blocks
      let cleanJson = aiResponse.response.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace('```json', '').replace('```', '').trim();
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace('```', '').replace('```', '').trim();
      }

      const metrics = JSON.parse(cleanJson) as ExtractedMetrics;
      
      // Default fallbacks in case the LLM deviates
      if (!["Positive", "Neutral", "Negative"].includes(metrics.sentiment)) {
          metrics.sentiment = "Neutral";
      }
      if (!["Beginner", "Intermediate", "Advanced"].includes(metrics.difficulty)) {
          metrics.difficulty = "Intermediate";
      }
      if (!["Machine Learning", "Web Dev", "Finance", "History", "Science", "Other"].includes(metrics.category)) {
          metrics.category = "Other";
      }

      return {
        metrics,
        modelUsed: aiResponse.modelUsed,
        tokensUsed: aiResponse.tokensUsed,
      };
    } catch (e) {
      console.error("Failed to parse metrics JSON:", e);
      // Fallback response for safe API continuation
      return {
        metrics: {
            sentiment: "Neutral",
            difficulty: "Intermediate",
            category: "Other"
        },
        modelUsed: aiResponse.modelUsed,
        tokensUsed: aiResponse.tokensUsed,
      };
    }
}
