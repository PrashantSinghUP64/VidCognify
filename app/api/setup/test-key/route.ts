import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(request: NextRequest) {

  try {
    const body = await request.json();
    const { service, apiKey } = body;

    if (!service || !apiKey) {
      return NextResponse.json(
        { error: "Service and apiKey are required" },
        { status: 400 }
      );
    }

    if (service === "groq") {
      // Test Groq API key by making a minimal chat completion request
      const client = new Groq({ apiKey });

      try {
        await client.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 5,
        });

        return NextResponse.json({
          success: true,
          message: "Groq API key is valid",
        });
      } catch (apiError: unknown) {
        const errorMessage =
          apiError instanceof Error ? apiError.message : "Unknown error";

        if (
          errorMessage.includes("401") ||
          errorMessage.includes("invalid_api_key") ||
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("Incorrect API key")
        ) {
          return NextResponse.json(
            { success: false, error: "Invalid Groq API key" },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { success: false, error: `API test failed: ${errorMessage}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: `Unsupported service: ${service}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error testing API key:", error);
    return NextResponse.json(
      { error: "Failed to test API key" },
      { status: 500 }
    );
  }
}
