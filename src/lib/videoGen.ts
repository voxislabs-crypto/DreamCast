/**
 * Video Generation Service
 *
 * Generates short (5–10 second) video clips that visualise the current
 * narrative scene. Supports Replicate (primary, for models like Kling / Luma)
 * and Runway Gen-3 (fallback). Falls back to a stub URL when no API keys are
 * configured (local development / testing).
 *
 * Clips are chained by passing the last frame URL as input to the next
 * generation, maintaining visual continuity across scenes.
 */

import type { VideoGenerationRequest, VideoGenerationResult } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Replicate provider
// ─────────────────────────────────────────────────────────────────────────────

async function generateViaReplicate(
  req: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  const token = process.env.REPLICATE_API_TOKEN!;
  const modelVersion = process.env.VIDEO_MODEL_VERSION!;

  const input: Record<string, unknown> = {
    prompt: req.prompt,
    duration: req.durationSeconds,
  };
  if (req.previousFrameUrl) {
    input["image"] = req.previousFrameUrl;
  }

  // Start the prediction
  const startRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({ version: modelVersion, input }),
  });

  if (!startRes.ok) {
    throw new Error(`Replicate start error: ${startRes.status}`);
  }

  const prediction = (await startRes.json()) as { id: string; status: string };

  // Poll until complete (max 120 s)
  const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Token ${token}` },
    });
    const poll = (await pollRes.json()) as {
      status: string;
      output?: string | string[];
      error?: string;
    };

    if (poll.status === "succeeded") {
      const url = Array.isArray(poll.output) ? poll.output[0] : poll.output!;
      return { url, durationSeconds: req.durationSeconds, provider: "replicate" };
    }
    if (poll.status === "failed") {
      throw new Error(`Replicate prediction failed: ${poll.error}`);
    }
  }

  throw new Error("Replicate prediction timed out");
}

// ─────────────────────────────────────────────────────────────────────────────
// Runway provider (fallback)
// ─────────────────────────────────────────────────────────────────────────────

async function generateViaRunway(
  req: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  const apiKey = process.env.RUNWAY_API_KEY!;

  const body: Record<string, unknown> = {
    textPrompt: req.prompt,
    seconds: req.durationSeconds,
  };
  if (req.previousFrameUrl) {
    body["initImage"] = req.previousFrameUrl;
  }

  const res = await fetch("https://api.runwayml.com/v1/generate/video", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Runway error: ${res.status}`);
  }

  const data = (await res.json()) as { url: string };
  return { url: data.url, durationSeconds: req.durationSeconds, provider: "runway" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stub provider (no API keys)
// ─────────────────────────────────────────────────────────────────────────────

function stubVideoResult(req: VideoGenerationRequest): VideoGenerationResult {
  // Return a royalty-free placeholder video for local development.
  return {
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    durationSeconds: req.durationSeconds,
    provider: "stub",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a short video clip for the given narrative prompt.
 * Automatically selects the configured provider or falls back to stub mode.
 */
export async function generateVideoClip(
  req: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  if (process.env.REPLICATE_API_TOKEN && process.env.VIDEO_MODEL_VERSION) {
    return generateViaReplicate(req);
  }

  if (process.env.RUNWAY_API_KEY) {
    return generateViaRunway(req);
  }

  // No video API configured — return stub for development.
  return stubVideoResult(req);
}

/**
 * Builds a concise video prompt from a narrative scene description.
 * Strips second-person pronouns to produce a cleaner text-to-video prompt.
 */
export function narrativeToVideoPrompt(
  narrativeText: string,
  genre: string
): string {
  const stripped = narrativeText
    .replace(/\bYou\b/gi, "The protagonist")
    .replace(/\byour\b/gi, "their")
    .replace(/\byourself\b/gi, "themselves");

  return `Cinematic ${genre} scene, 720p, photoreal: ${stripped.slice(0, 300)}`;
}
