// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for EdgeDream
// ─────────────────────────────────────────────────────────────────────────────

/** Available story genres the player may choose. */
export type Genre =
  | "fantasy"
  | "mystery"
  | "sci-fi"
  | "adventure"
  | "romance"
  | "thriller";

/** Subscription tier controlling session length and feature access. */
export type SubscriptionTier = "free" | "basic" | "premium" | "ultra";

/** Limits applied per subscription tier. */
export interface TierLimits {
  maxClipsPerSession: number;
  maxSessionMinutes: number;
  videoEnabled: boolean;
  voiceInputEnabled: boolean;
  crossSessionMemory: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxClipsPerSession: 2,
    maxSessionMinutes: 5,
    videoEnabled: false,
    voiceInputEnabled: false,
    crossSessionMemory: false,
  },
  basic: {
    maxClipsPerSession: 10,
    maxSessionMinutes: 10,
    videoEnabled: true,
    voiceInputEnabled: true,
    crossSessionMemory: false,
  },
  premium: {
    maxClipsPerSession: 20,
    maxSessionMinutes: 20,
    videoEnabled: true,
    voiceInputEnabled: true,
    crossSessionMemory: true,
  },
  ultra: {
    maxClipsPerSession: 50,
    maxSessionMinutes: 60,
    videoEnabled: true,
    voiceInputEnabled: true,
    crossSessionMemory: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

export interface AvatarSkills {
  agility: number; // 0–100
  intelligence: number;
  charisma: number;
  strength: number;
}

export interface Avatar {
  name: string;
  appearance: string;
  skills: AvatarSkills;
  inventory: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene & Narrative
// ─────────────────────────────────────────────────────────────────────────────

export interface BranchChoice {
  id: string;
  label: string;
  hint?: string; // optional narrative hint about difficulty
}

export interface SceneOutcome {
  success: boolean;
  probability: number; // 0–100, the calculated chance of success
  explanation: string; // human-readable reasoning
}

export interface Scene {
  id: string;
  sequenceNumber: number;
  narrativeText: string; // second-person prose from the LLM narrator
  choices: BranchChoice[]; // suggested branches (2–3)
  videoUrl?: string; // short clip URL if video is enabled
  outcome?: SceneOutcome; // result of the previous player action
  /** The actual player input that triggered this scene (used for history replay). */
  playerAction?: string;
  /** Environment tags returned by the narrator for this scene (used by consequence engine). */
  environmentTags?: string[];
  createdAt: string; // ISO timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

export type SessionStatus = "active" | "paused" | "completed" | "game_over";

export interface Session {
  id: string;
  userId: string;
  genre: Genre;
  customScenario?: string; // free-text description from the user
  avatar: Avatar;
  scenes: Scene[];
  status: SessionStatus;
  tier: SubscriptionTier;
  startedAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API payloads
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateSessionRequest {
  userId: string;
  genre: Genre;
  customScenario?: string;
  avatar: Avatar;
  tier: SubscriptionTier;
}

export interface PlayerActionRequest {
  sessionId: string;
  userId: string;
  input: string; // free text or selected branch label
  choiceId?: string;
}

export interface PlayerActionResponse {
  scene: Scene;
  sessionStatus: SessionStatus;
  clipsUsed: number;
  clipsRemaining: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Video generation
// ─────────────────────────────────────────────────────────────────────────────

export interface VideoGenerationRequest {
  prompt: string;
  previousFrameUrl?: string;
  durationSeconds: number; // 5 or 10
}

export interface VideoGenerationResult {
  url: string;
  durationSeconds: number;
  provider: "replicate" | "runway" | "stub";
}
