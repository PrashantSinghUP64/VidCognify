import Groq from "groq-sdk";
// Removed getUserApiKey import

const GROQ_MODEL = "llama-3.3-70b-versatile";

/**
 * Per-user Groq client cache to avoid recreating clients
 */
const groqClients: Map<string, Groq> = new Map();

/**
 * Gets or creates a Groq client for a specific user.
 *
 * @param userId - The user's ID to fetch their API key
 * @returns Promise<Groq | null> - The Groq client, or null if API key is not configured
 */
export async function getGroqClient(userId?: string): Promise<Groq | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  // We can still optionally cache per user, or just return a global client.
  // Returning a new client every time is fine, or cache globally.
  if (groqClients.has("global")) {
    return groqClients.get("global") || null;
  }

  const client = new Groq({ apiKey });
  groqClients.set("global", client);
  return client;
}

/**
 * Clears the cached Groq client for a specific user.
 * Useful when the API key is updated.
 *
 * @param userId - The user's ID
 */
export function clearGroqClient(userId: string): void {
  groqClients.delete(userId);
}

/**
 * Checks if Groq is configured and available for a user.
 *
 * @param userId - The user's ID
 * @returns Promise<boolean> - true if Groq API key is configured
 */
export async function isGroqConfigured(userId?: string): Promise<boolean> {
  const apiKey = process.env.GROQ_API_KEY;
  return Boolean(apiKey && apiKey.length > 0);
}

/**
 * Returns the Groq model name used for inference.
 */
export function getGroqModelName(): string {
  return GROQ_MODEL;
}
