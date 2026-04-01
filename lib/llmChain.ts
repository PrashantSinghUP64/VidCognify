import { getGroqClient, isGroqConfigured } from "./groq";

/**
 * Model identifiers for the fallback chain
 */
export type ModelId = "llama-3.3-70b-versatile";

/**
 * Provider group type
 */
export type ProviderGroup = "groq";

/**
 * Model to provider group mapping
 */
const MODEL_GROUPS: Record<ModelId, ProviderGroup> = {
  "llama-3.3-70b-versatile": "groq",
};

/**
 * Model information type
 */
export interface ModelInfo {
  id: ModelId;
  name: string;
  available: boolean;
  group: ProviderGroup;
}

/**
 * Response from the LLM call
 */
export interface LlmResponse {
  response: string;
  modelUsed: ModelId;
  tokensUsed?: number;
}

/**
 * Options for the LLM call
 */
export interface LlmCallOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  preferredModel?: ModelId;
  userId?: string;
}

/**
 * Gets all models and their availability status for a specific user.
 *
 * @param userId - The user's ID to check their configured API keys
 * @returns Promise<ModelInfo[]> - Array of model info with availability
 */
export async function getAvailableModels(userId?: string): Promise<ModelInfo[]> {
  const groqAvailable = await isGroqConfigured();

  return [
    {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B (Groq)",
      available: groqAvailable,
      group: "groq" as ProviderGroup,
    },
  ];
}

/**
 * Calls an LLM with automatic fallback to other models if primary fails.
 *
 * @param prompt - The user prompt to send
 * @param options - Optional configuration for the call (must include userId)
 * @returns Promise<LlmResponse> - The response and model used
 * @throws Error if all models fail or userId is not provided
 */
export async function callWithFallback(
  prompt: string,
  options: LlmCallOptions = {}
): Promise<LlmResponse> {
  const { maxTokens = 4096, temperature = 0.7, systemPrompt, userId } = options;

  const errors: { model: ModelId; error: string }[] = [];

  const preferredModel: ModelId =
    options.preferredModel || "llama-3.3-70b-versatile";
  const group = MODEL_GROUPS[preferredModel];

  // Build order: preferred first, then other models in same group
  const groupModels = Object.entries(MODEL_GROUPS)
    .filter(([, g]) => g === group)
    .map(([id]) => id as ModelId);

  const modelOrder: ModelId[] = [
    preferredModel,
    ...groupModels.filter((m) => m !== preferredModel),
  ];

  // Try each model in order
  for (const modelId of modelOrder) {
    try {
      const result = await callModel(modelId, prompt, {
        maxTokens,
        temperature,
        systemPrompt,
        userId,
      });
      if (result) {
        return result;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push({ model: modelId, error: errorMessage });
      console.warn(`Model ${modelId} failed:`, errorMessage);
    }
  }

  // All models failed
  throw new Error(
    `All models failed. Errors: ${errors
      .map((e) => `${e.model}: ${e.error}`)
      .join("; ")}`
  );
}

/**
 * Calls a specific model.
 * Returns null if model is not configured.
 */
async function callModel(
  modelId: ModelId,
  prompt: string,
  options: {
    maxTokens: number;
    temperature: number;
    systemPrompt?: string;
    userId?: string;
  }
): Promise<LlmResponse | null> {
  switch (modelId) {
    case "llama-3.3-70b-versatile":
      return callGroq(prompt, options);
    default:
      return null;
  }
}

/**
 * Call Groq with llama-3.3-70b-versatile
 */
async function callGroq(
  prompt: string,
  options: {
    maxTokens: number;
    temperature: number;
    systemPrompt?: string;
    userId?: string;
  }
): Promise<LlmResponse | null> {
  const client = await getGroqClient();
  if (!client) return null;

  const messages: { role: "system" | "user"; content: string }[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in Groq response");
  }

  return {
    response: content,
    modelUsed: "llama-3.3-70b-versatile",
    tokensUsed: completion.usage?.total_tokens,
  };
}
