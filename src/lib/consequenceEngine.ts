/**
 * Consequence & Probability Engine
 *
 * Calculates realistic, deterministic outcome probabilities for player actions
 * so results feel earned rather than arbitrary. The engine combines avatar
 * stats, environmental context, and action intent to produce a weighted chance
 * of success, then resolves the outcome and generates a human-readable
 * explanation.
 */

import type { Avatar, AvatarSkills, SceneOutcome } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionContext {
  /** Free-text description of what the player wants to do. */
  actionText: string;
  /** Environment keywords that modify difficulty (e.g. "rain", "dark", "crowd"). */
  environmentTags?: string[];
  /** Narrative tags describing the challenge (e.g. "locked_door", "combat", "negotiation"). */
  challengeTags?: string[];
  /** The player's current avatar. */
  avatar: Avatar;
}

interface StatWeight {
  skill: keyof AvatarSkills;
  weight: number; // how much this skill contributes (0–1, sum ≤ 1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment modifiers  (tag → delta percentage points)
// ─────────────────────────────────────────────────────────────────────────────

const ENVIRONMENT_MODIFIERS: Record<string, number> = {
  rain: -5,
  fog: -8,
  dark: -10,
  night: -5,
  crowd: -3,
  bright: +5,
  daylight: +5,
  familiar: +8,
  home: +10,
};

// ─────────────────────────────────────────────────────────────────────────────
// Challenge profiles  (tag → relevant skills with weights)
// ─────────────────────────────────────────────────────────────────────────────

const CHALLENGE_PROFILES: Record<string, StatWeight[]> = {
  combat: [
    { skill: "agility", weight: 0.5 },
    { skill: "strength", weight: 0.5 },
  ],
  negotiation: [
    { skill: "charisma", weight: 0.6 },
    { skill: "intelligence", weight: 0.4 },
  ],
  puzzle: [{ skill: "intelligence", weight: 1.0 }],
  stealth: [
    { skill: "agility", weight: 0.7 },
    { skill: "intelligence", weight: 0.3 },
  ],
  persuasion: [
    { skill: "charisma", weight: 0.8 },
    { skill: "intelligence", weight: 0.2 },
  ],
  athletics: [
    { skill: "agility", weight: 0.6 },
    { skill: "strength", weight: 0.4 },
  ],
  investigation: [{ skill: "intelligence", weight: 1.0 }],
  locked_door: [
    { skill: "intelligence", weight: 0.5 },
    { skill: "strength", weight: 0.5 },
  ],
  default: [
    { skill: "agility", weight: 0.25 },
    { skill: "intelligence", weight: 0.25 },
    { skill: "charisma", weight: 0.25 },
    { skill: "strength", weight: 0.25 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Keyword → challenge tag inference
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_KEYWORD_MAP: Array<{ keywords: string[]; tag: string }> = [
  { keywords: ["fight", "attack", "strike", "hit", "punch", "shoot"], tag: "combat" },
  { keywords: ["sneak", "hide", "creep", "slip", "tiptoe"], tag: "stealth" },
  { keywords: ["persuade", "convince", "charm", "flirt", "negotiate"], tag: "persuasion" },
  { keywords: ["solve", "decode", "unlock", "crack", "figure"], tag: "puzzle" },
  { keywords: ["run", "jump", "climb", "sprint", "dash", "swim"], tag: "athletics" },
  { keywords: ["investigate", "examine", "search", "inspect", "analyse"], tag: "investigation" },
  { keywords: ["talk", "ask", "speak", "negotiate", "bargain"], tag: "negotiation" },
];

function inferChallengeTags(actionText: string): string[] {
  const lower = actionText.toLowerCase();
  const tags: string[] = [];
  for (const { keywords, tag } of ACTION_KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      tags.push(tag);
    }
  }
  return tags.length > 0 ? tags : ["default"];
}

// ─────────────────────────────────────────────────────────────────────────────
// Core calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes a success probability (0–100) for a given action + context.
 *
 * Formula:
 *   baseProbability = weighted average of relevant avatar skills
 *   adjusted        = baseProbability + sum(environment modifiers)
 *   clamped         = clamp(adjusted, 5, 95)  ← always a small chance each way
 */
export function calculateProbability(ctx: ActionContext): number {
  const challengeTags =
    ctx.challengeTags && ctx.challengeTags.length > 0
      ? ctx.challengeTags
      : inferChallengeTags(ctx.actionText);

  // Average stat contribution across all matching challenge profiles
  const allWeights: StatWeight[] = [];
  for (const tag of challengeTags) {
    const profile = CHALLENGE_PROFILES[tag] ?? CHALLENGE_PROFILES["default"];
    allWeights.push(...profile);
  }

  // Collapse weights per skill
  const skillTotals: Partial<Record<keyof AvatarSkills, number>> = {};
  let totalWeight = 0;
  for (const { skill, weight } of allWeights) {
    skillTotals[skill] = (skillTotals[skill] ?? 0) + weight;
    totalWeight += weight;
  }

  let baseProbability = 0;
  for (const [skill, weight] of Object.entries(skillTotals) as [
    keyof AvatarSkills,
    number
  ][]) {
    baseProbability += (ctx.avatar.skills[skill] / 100) * (weight / totalWeight) * 100;
  }

  // Apply environment modifiers
  let environmentDelta = 0;
  for (const tag of ctx.environmentTags ?? []) {
    environmentDelta += ENVIRONMENT_MODIFIERS[tag.toLowerCase()] ?? 0;
  }

  const adjusted = baseProbability + environmentDelta;
  return Math.round(Math.min(95, Math.max(5, adjusted)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Outcome resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves whether an action succeeds given a probability.
 * Uses a seeded-style approach: the outcome is deterministic given a
 * roll value, which callers may inject for testability.
 */
export function resolveOutcome(
  probability: number,
  roll?: number
): boolean {
  const r = roll ?? Math.random() * 100;
  return r < probability;
}

/**
 * Generates a human-readable explanation for the outcome.
 */
export function explainOutcome(
  ctx: ActionContext,
  probability: number,
  success: boolean
): string {
  const challengeTags =
    ctx.challengeTags && ctx.challengeTags.length > 0
      ? ctx.challengeTags
      : inferChallengeTags(ctx.actionText);

  const primaryTag = challengeTags[0] ?? "default";
  const profile = CHALLENGE_PROFILES[primaryTag] ?? CHALLENGE_PROFILES["default"];
  const topSkill = [...profile].sort((a, b) => b.weight - a.weight)[0].skill;
  const skillValue = ctx.avatar.skills[topSkill];

  const envParts = (ctx.environmentTags ?? [])
    .filter((t) => ENVIRONMENT_MODIFIERS[t.toLowerCase()] !== undefined)
    .map((t) => {
      const delta = ENVIRONMENT_MODIFIERS[t.toLowerCase()];
      return `${t} (${delta > 0 ? "+" : ""}${delta}%)`;
    });

  const envNote =
    envParts.length > 0 ? ` Environmental factors: ${envParts.join(", ")}.` : "";

  if (success) {
    return `Success (${probability}% chance). Your ${topSkill} of ${skillValue} carried the action.${envNote}`;
  } else {
    return `Failure (${100 - probability}% chance of failure). Your ${topSkill} of ${skillValue} wasn't quite enough.${envNote} Consider a different approach.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full pipeline: calculate probability → resolve outcome → explain.
 */
export function evaluateAction(ctx: ActionContext): SceneOutcome {
  const probability = calculateProbability(ctx);
  const success = resolveOutcome(probability);
  const explanation = explainOutcome(ctx, probability, success);
  return { success, probability, explanation };
}
