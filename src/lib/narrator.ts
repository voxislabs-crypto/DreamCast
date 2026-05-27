/**
 * LLM Narrator
 *
 * Drives the live second-person storytelling engine. Maintains a message
 * history (long-context window) for continuity across scenes, generates
 * narrative prose, and proposes 2–3 branching choices per turn.
 *
 * Compatible with any OpenAI-spec API (OpenAI, DeepInfra, xAI Grok, etc.)
 * via the NARRATION_* environment variables.
 */

import type { Avatar, BranchChoice, Genre, Scene, Session } from "@/types";
import type { RenderMode } from "@/types";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────────────────────────────────────
// System prompt factory
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(genre: Genre, avatar: Avatar): string {
  return `You are EdgeDream, an immersive interactive fiction narrator.

STYLE
- Write in vivid second-person ("You step into…").
- Keep each narrative block to 3–5 sentences: evocative but concise.
- Genre: ${genre}. Match tone, vocabulary, and atmosphere to the genre.
- The player's avatar: ${avatar.name} (${avatar.appearance}).
  Skills — agility: ${avatar.skills.agility}, intelligence: ${avatar.skills.intelligence},
  charisma: ${avatar.skills.charisma}, strength: ${avatar.skills.strength}.
  Inventory: ${avatar.inventory.join(", ") || "nothing"}.

OUTPUT FORMAT
Return a JSON object with exactly these keys:
{
  "narrativeText": "<3-5 sentence second-person scene description>",
  "choices": [
    { "id": "a", "label": "<short action phrase>", "hint": "<optional risk hint>" },
    { "id": "b", "label": "<short action phrase>", "hint": "<optional risk hint>" },
    { "id": "c", "label": "<short action phrase>", "hint": "<optional risk hint>" }
  ],
  "environmentTags": ["<tag1>", "<tag2>"],
  "challengeTags": ["<tag1>"]
}

RULES
- Always provide exactly 2 or 3 choices.
- If the player does something off-script (e.g. "I fly on a dragon"), adapt gracefully:
  re-interpret it within world logic and narrate accordingly.
- If the player's last action failed, acknowledge consequences, then continue the story.
- Keep content appropriate for a general audience. Avoid explicit sexual content,
  graphic gore, or content that targets real individuals.
- Do not break character. Do not reveal you are an AI.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types returned by the LLM
// ─────────────────────────────────────────────────────────────────────────────

interface NarratorLLMOutput {
  narrativeText: string;
  choices: BranchChoice[];
  environmentTags?: string[];
  challengeTags?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Message history builder
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function buildMessageHistory(
  session: Session,
  latestPlayerInput: string,
  outcomeDescription?: string
): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt(session.genre, session.avatar),
    },
  ];

  // Re-inject prior scenes to maintain continuity (up to last 10 for token budget)
  const recentScenes = session.scenes.slice(-10);
  for (const scene of recentScenes) {
    messages.push({ role: "assistant", content: scene.narrativeText });
    if (scene.playerAction) {
      messages.push({
        role: "user",
        content: `Player action: ${scene.playerAction}`,
      });
    }
  }

  // Current player action
  const userContent = outcomeDescription
    ? `Player action: "${latestPlayerInput}"\nOutcome: ${outcomeDescription}`
    : `Player action: "${latestPlayerInput}"`;

  messages.push({ role: "user", content: userContent });
  return messages;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM API call
// ─────────────────────────────────────────────────────────────────────────────

async function callNarratorLLM(
  messages: ChatMessage[]
): Promise<NarratorLLMOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl =
    process.env.NARRATION_BASE_URL ??
    process.env.OPENAI_BASE_URL ??
    "https://api.openai.com/v1";
  const model = process.env.NARRATION_MODEL ?? "gpt-4o";

  if (!apiKey) {
    // Stub response for local development without API credentials.
    return stubNarratorResponse();
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Narrator LLM error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const raw = data.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as NarratorLLMOutput;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stub (no API key)
// ─────────────────────────────────────────────────────────────────────────────

function stubNarratorResponse(): NarratorLLMOutput {
  return {
    narrativeText:
      "You stand at the threshold of adventure, the air thick with possibility. " +
      "Ancient stones whisper forgotten secrets beneath your feet. " +
      "Three paths diverge before you, each promising its own mystery.",
    choices: [
      { id: "a", label: "Follow the glowing lights to the left", hint: "Seems inviting" },
      { id: "b", label: "Venture into the shadowed path ahead", hint: "Risky but intriguing" },
      { id: "c", label: "Examine the strange inscription on the wall", hint: "Safe, possibly revealing" },
    ],
    environmentTags: ["stone", "dim"],
    challengeTags: ["investigation"],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface NarratorResult {
  narrativeText: string;
  choices: BranchChoice[];
  environmentTags: string[];
  challengeTags: string[];
}

/**
 * Generates the opening scene for a new session.
 */
export async function generateOpeningScene(
  session: Session
): Promise<NarratorResult> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt(session.genre, session.avatar),
    },
    {
      role: "user",
      content: session.customScenario
        ? `Begin a ${session.genre} story with this scenario: "${session.customScenario}"`
        : `Begin a ${session.genre} adventure. Set the opening scene.`,
    },
  ];

  const output = await callNarratorLLM(messages);
  return {
    narrativeText: output.narrativeText,
    choices: output.choices ?? [],
    environmentTags: output.environmentTags ?? [],
    challengeTags: output.challengeTags ?? [],
  };
}

/**
 * Generates the next scene after a player action.
 */
export async function generateNextScene(
  session: Session,
  playerInput: string,
  outcomeDescription?: string
): Promise<NarratorResult> {
  const messages = buildMessageHistory(session, playerInput, outcomeDescription);
  const output = await callNarratorLLM(messages);
  return {
    narrativeText: output.narrativeText,
    choices: output.choices ?? [],
    environmentTags: output.environmentTags ?? [],
    challengeTags: output.challengeTags ?? [],
  };
}

/**
 * Builds a Scene object from a narrator result.
 */
export function buildScene(
  result: NarratorResult,
  sequenceNumber: number,
  videoUrl?: string,
  outcome?: Scene["outcome"],
  playerAction?: string,
  renderMode?: RenderMode
): Scene {
  return {
    id: uuidv4(),
    sequenceNumber,
    narrativeText: result.narrativeText,
    choices: result.choices,
    videoUrl,
    renderMode,
    outcome,
    playerAction,
    environmentTags: result.environmentTags,
    createdAt: new Date().toISOString(),
  };
}
