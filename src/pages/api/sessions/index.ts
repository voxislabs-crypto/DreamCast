/**
 * POST /api/sessions
 * Creates a new storytelling session and returns the opening scene.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";
import type {
  CreateSessionRequest,
  PlayerActionResponse,
  Session,
} from "@/types";
import { TIER_LIMITS } from "@/types";
import { saveSession } from "@/lib/sessionStore";
import { generateOpeningScene, buildScene } from "@/lib/narrator";
import { generateVideoClip, narrativeToVideoPrompt } from "@/lib/videoGen";
import { moderateText } from "@/lib/contentModeration";
import { decideRenderMode } from "@/lib/director";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as Partial<CreateSessionRequest>;

  // Basic validation
  if (!body.userId || !body.genre || !body.avatar || !body.tier) {
    return res.status(400).json({ error: "Missing required fields: userId, genre, avatar, tier" });
  }

  // Moderate custom scenario input
  if (body.customScenario) {
    const modResult = await moderateText(body.customScenario);
    if (!modResult.safe) {
      return res.status(422).json({
        error: "Custom scenario contains disallowed content.",
        flaggedCategories: modResult.flaggedCategories,
      });
    }
  }

  const session: Session = {
    id: uuidv4(),
    userId: body.userId,
    genre: body.genre,
    customScenario: body.customScenario,
    avatar: body.avatar,
    scenes: [],
    status: "active",
    tier: body.tier,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Generate opening scene narrative
  const narratorResult = await generateOpeningScene(session);

  // Generate opening video clip if tier supports it
  const limits = TIER_LIMITS[body.tier];
  const directorDecision = decideRenderMode({
    tier: body.tier,
    sceneNumber: 1,
    clipsUsed: 0,
    maxClipsPerSession: limits.maxClipsPerSession,
    videoEnabled: limits.videoEnabled,
    environmentTags: narratorResult.environmentTags,
  });
  let videoUrl: string | undefined;
  if (directorDecision.shouldGenerateVideo) {
    try {
      const videoResult = await generateVideoClip({
        prompt: narrativeToVideoPrompt(narratorResult.narrativeText, body.genre),
        durationSeconds: 5,
      });
      videoUrl = videoResult.url;
    } catch (err) {
      console.error("[video] generation failed, continuing without clip:", err);
    }
  }

  const openingScene = buildScene(
    narratorResult,
    1,
    videoUrl,
    undefined,
    undefined,
    directorDecision.renderMode
  );
  session.scenes.push(openingScene);
  await saveSession(session);

  const response: PlayerActionResponse = {
    scene: openingScene,
    sessionStatus: session.status,
    clipsUsed: limits.videoEnabled ? 1 : 0,
    clipsRemaining: limits.maxClipsPerSession - (limits.videoEnabled ? 1 : 0),
  };

  return res.status(201).json(response);
}
