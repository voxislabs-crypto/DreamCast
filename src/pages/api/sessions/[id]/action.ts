/**
 * POST /api/sessions/[id]/action
 * Processes a player action, runs the consequence engine, generates
 * the next narrative scene and optional video clip.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import type {
  PlayerActionRequest,
  PlayerActionResponse,
  Session,
  SessionStatus,
} from "@/types";
import { TIER_LIMITS } from "@/types";
import { getSession, saveSession } from "@/lib/sessionStore";
import { evaluateAction } from "@/lib/consequenceEngine";
import { generateNextScene, buildScene } from "@/lib/narrator";
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

  const { id } = req.query as { id: string };
  const body = req.body as Partial<PlayerActionRequest>;

  if (!body.userId || !body.input) {
    return res.status(400).json({ error: "Missing required fields: userId, input" });
  }

  // Load session
  const session = await getSession(id);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  if (session.userId !== body.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (session.status !== "active") {
    return res.status(409).json({ error: `Session is ${session.status}` });
  }

  // Moderate player input
  const modResult = await moderateText(body.input);
  if (!modResult.safe) {
    return res.status(422).json({
      error: "Input contains disallowed content.",
      flaggedCategories: modResult.flaggedCategories,
    });
  }

  const limits = TIER_LIMITS[session.tier];
  const clipsUsed = session.scenes.filter((s) => s.videoUrl).length;

  // Enforce session clip cap
  if (limits.videoEnabled && clipsUsed >= limits.maxClipsPerSession) {
    return res.status(429).json({
      error: "Session clip limit reached. Upgrade your plan to continue.",
    });
  }

  // ── Consequence engine ──────────────────────────────────────────────────────
  const lastScene = session.scenes[session.scenes.length - 1];
  const outcome = evaluateAction({
    actionText: body.input,
    environmentTags: lastScene?.environmentTags ?? [],
    avatar: session.avatar,
  });

  // Detect game-over (consecutive failures can end the session)
  const recentFailures = session.scenes
    .slice(-3)
    .filter((s) => s.outcome && !s.outcome.success).length;

  let sessionStatus: SessionStatus = session.status;
  if (!outcome.success && recentFailures >= 2) {
    sessionStatus = "game_over";
  }

  // ── Narrator ────────────────────────────────────────────────────────────────
  const narratorResult = await generateNextScene(
    session,
    body.input,
    outcome.explanation
  );

  // ── Video clip ──────────────────────────────────────────────────────────────
  const directorDecision = decideRenderMode({
    tier: session.tier,
    sceneNumber: session.scenes.length + 1,
    clipsUsed,
    maxClipsPerSession: limits.maxClipsPerSession,
    videoEnabled: limits.videoEnabled && sessionStatus === "active",
    environmentTags: narratorResult.environmentTags,
    outcomeSuccess: outcome.success,
    recentScenes: session.scenes,
  });

  let videoUrl: string | undefined;
  if (directorDecision.shouldGenerateVideo) {
    const previousFrameUrl = lastScene?.videoUrl;
    try {
      const videoResult = await generateVideoClip({
        prompt: narrativeToVideoPrompt(narratorResult.narrativeText, session.genre),
        previousFrameUrl,
        durationSeconds: 5,
      });
      videoUrl = videoResult.url;
    } catch (err) {
      console.error("[video] generation failed, continuing without clip:", err);
    }
  }

  // ── Build and persist new scene ──────────────────────────────────────────────
  const newScene = buildScene(
    narratorResult,
    session.scenes.length + 1,
    videoUrl,
    {
      success: outcome.success,
      probability: outcome.probability,
      explanation: outcome.explanation,
    },
    body.input,
    directorDecision.renderMode
  );

  const updatedSession: Session = {
    ...session,
    scenes: [...session.scenes, newScene],
    status: sessionStatus,
    updatedAt: new Date().toISOString(),
  };

  await saveSession(updatedSession);

  const newClipsUsed = updatedSession.scenes.filter((s) => s.videoUrl).length;
  const response: PlayerActionResponse = {
    scene: newScene,
    sessionStatus,
    clipsUsed: newClipsUsed,
    clipsRemaining: Math.max(0, limits.maxClipsPerSession - newClipsUsed),
  };

  return res.status(200).json(response);
}
