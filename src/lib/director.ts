import type { DirectorDecision, Scene, SubscriptionTier } from "@/types";

const VIDEO_WORTHY_TAGS = new Set([
  "action",
  "battle",
  "combat",
  "chase",
  "climax",
  "danger",
  "reveal",
  "storm",
]);

const TEXT_FRIENDLY_TAGS = new Set([
  "dialogue",
  "investigation",
  "planning",
  "puzzle",
  "quiet",
  "social",
]);

interface DirectorInput {
  tier: SubscriptionTier;
  sceneNumber: number;
  clipsUsed: number;
  maxClipsPerSession: number;
  videoEnabled: boolean;
  environmentTags?: string[];
  outcomeSuccess?: boolean;
  recentScenes?: Scene[];
}

export function decideRenderMode(input: DirectorInput): DirectorDecision {
  if (!input.videoEnabled) {
    return {
      renderMode: "text_only",
      shouldGenerateVideo: false,
      reason: "Current tier does not include video generation.",
    };
  }

  if (input.clipsUsed >= input.maxClipsPerSession) {
    return {
      renderMode: "text_only",
      shouldGenerateVideo: false,
      reason: "Session clip budget is exhausted.",
    };
  }

  const tags = new Set((input.environmentTags ?? []).map((tag) => tag.toLowerCase()));
  const hasVideoWorthyTag = Array.from(tags).some((tag) => VIDEO_WORTHY_TAGS.has(tag));
  const hasTextFriendlyTag = Array.from(tags).some((tag) => TEXT_FRIENDLY_TAGS.has(tag));
  const isOpeningBeat = input.sceneNumber === 1;
  const isFailureBeat = input.outcomeSuccess === false;
  const remainingClipRatio =
    (input.maxClipsPerSession - input.clipsUsed) / input.maxClipsPerSession;

  if (isOpeningBeat || isFailureBeat || hasVideoWorthyTag) {
    return {
      renderMode: "video",
      shouldGenerateVideo: true,
      reason: "High-impact beat merits full video.",
    };
  }

  if (hasTextFriendlyTag || remainingClipRatio < 0.35) {
    return {
      renderMode: "ambient_image",
      shouldGenerateVideo: false,
      reason: "Lower-motion scene preserves clip budget.",
    };
  }

  if (input.tier === "ultra" || input.tier === "premium") {
    return {
      renderMode: "animated_still",
      shouldGenerateVideo: false,
      reason: "Premium tier gets richer ambience without spending video.",
    };
  }

  return {
    renderMode: "text_only",
    shouldGenerateVideo: false,
    reason: "Defaulting to text to protect unit economics.",
  };
}
