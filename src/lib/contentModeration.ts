/**
 * Content Moderation
 *
 * Validates player inputs and LLM outputs before they are processed or
 * displayed. Uses the OpenAI Moderation API as the primary check, with
 * a simple keyword blocklist as a synchronous fast-path.
 *
 * The system defaults to a safe, general-audience experience. All content
 * must pass moderation before it is passed to the narrator or displayed to
 * the user.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Blocklist fast-path (synchronous, zero API calls)
// ─────────────────────────────────────────────────────────────────────────────

const BLOCKED_PATTERNS: RegExp[] = [
  /\b(csam|child\s*porn|underage\s*sex)\b/i,
  /\b(real\s*person\s*harm|kill\s+real\s+person)\b/i,
];

export function passesBlocklist(text: string): boolean {
  return !BLOCKED_PATTERNS.some((re) => re.test(text));
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI Moderation API
// ─────────────────────────────────────────────────────────────────────────────

export interface ModerationResult {
  safe: boolean;
  flaggedCategories: string[];
}

/**
 * Calls the OpenAI moderation endpoint to check arbitrary text.
 * Returns { safe: true } when the text is within acceptable bounds.
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // In test / stub mode, skip remote check and rely on blocklist only.
    return { safe: passesBlocklist(text), flaggedCategories: [] };
  }

  // Synchronous blocklist check before hitting the API.
  if (!passesBlocklist(text)) {
    return { safe: false, flaggedCategories: ["blocklist"] };
  }

  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: text }),
  });

  if (!response.ok) {
    // On API error, fail open (allow) but log for monitoring.
    console.warn("[moderation] API error, failing open:", response.status);
    return { safe: true, flaggedCategories: [] };
  }

  const data = (await response.json()) as {
    results: Array<{
      flagged: boolean;
      categories: Record<string, boolean>;
    }>;
  };

  const result = data.results[0];
  const flaggedCategories = Object.entries(result.categories)
    .filter(([, flagged]) => flagged)
    .map(([category]) => category);

  return { safe: !result.flagged, flaggedCategories };
}
