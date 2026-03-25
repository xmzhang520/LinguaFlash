import { Card } from "./sr-engine";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_KEY;

// ── Main hint function ────────────────────────────────────────────────────────

console.log("API KEY:", process.env.EXPO_PUBLIC_ANTHROPIC_KEY?.slice(0, 15));
export async function getHint(
  card: Card,
  nativeLang: string = "English",
  targetLang: string = "the target language",
): Promise<string> {
  const prompt = `You are a friendly language tutor helping a student learn ${targetLang}.
  

Word/phrase on flashcard: "${card.front}"
Translation: "${card.back}"
${card.context ? `Example sentence: "${card.context}"` : ""}

Give a helpful hint in ${nativeLang} that helps the student remember this word.
Keep it to 2-3 sentences maximum. Include:
- A memorable tip, mnemonic, or association
- One short example of how to use it naturally

Be warm, encouraging and concise.`;

  console.log("API KEY:", process.env.EXPO_PUBLIC_ANTHROPIC_KEY?.slice(0, 15));

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  console.log("Response status:", response.status);
  const data = await response.json();

  console.log("Response data:", JSON.stringify(data));
  return data.content[0].text;
}

// ── Grammar explanation (deeper, uses Sonnet) ─────────────────────────────────

export async function getExplanation(
  card: Card,
  nativeLang: string = "English",
  targetLang: string = "the target language",
): Promise<string> {
  const prompt = `You are a language teacher explaining ${targetLang} grammar.

Word/phrase: "${card.front}"
Translation: "${card.back}"
${card.context ? `Context: "${card.context}"` : ""}

Explain in ${nativeLang}:
1. What grammatical category this belongs to (noun, verb, etc.)
2. Any important grammar rules around using it
3. Common mistakes learners make with this word

Keep the explanation clear and practical. Max 4 sentences.`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
