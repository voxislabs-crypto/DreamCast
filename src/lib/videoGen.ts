/**
 * Video Generation Service
 *
 * Generates short video clips that visualize the current narrative scene.
 * SiliconFlow is preferred for low-cost image-to-video chaining, with
 * Replicate and Runway retained as fallbacks. Local development uses a stub.
 */

import type { VideoGenerationRequest, VideoGenerationResult } from "@/types";

const SILICONFLOW_API_BASE =
  process.env.SILICONFLOW_API_BASE ?? "https://api.siliconflow.com/v1";
const SILICONFLOW_MODEL =
  process.env.SILICONFLOW_VIDEO_MODEL ?? "Wan-AI/Wan2.2-I2V-A14B";

async function generateViaSiliconFlow(
  req: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  const token = process.env.SILICONFLOW_API_KEY!;

  const body: Record<string, unknown> = {
    model: SILICONFLOW_MODEL,
    prompt: req.prompt,
    image_size: "1280x720",
  };

  if (req.previousFrameUrl) {
    body.image = req.previousFrameUrl;
  }

  const submitRes = await fetch(`${SILICONFLOW_API_BASE}/video/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text();
    throw new Error(`SiliconFlow submit error ${submitRes.status}: ${errorText}`);
  }

  const submit = (await submitRes.json()) as { requestId: string };

  for (let i = 0; i < 36; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusRes = await fetch(`${SILICONFLOW_API_BASE}/video/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId: submit.requestId }),
    });

    if (!statusRes.ok) {
      const errorText = await statusRes.text();
      throw new Error(`SiliconFlow status error ${statusRes.status}: ${errorText}`);
    }

    const status = (await statusRes.json()) as {
      status: "Succeed" | "InQueue" | "InProgress" | "Failed";
      reason?: string;
      results?: { videos?: Array<{ url: string }> };
    };

    if (status.status === "Succeed") {
      const url = status.results?.videos?.[0]?.url;
      if (!url) {
        throw new Error("SiliconFlow response succeeded without a video URL");
      }
      return { url, durationSeconds: req.durationSeconds, provider: "siliconflow" };
    }

    if (status.status === "Failed") {
      throw new Error(`SiliconFlow generation failed: ${status.reason ?? "unknown"}`);
    }
  }

  throw new Error("SiliconFlow generation timed out");
}

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
    input.image = req.previousFrameUrl;
  }

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

  const prediction = (await startRes.json()) as { id: string };
  const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;

  for (let i = 0; i < 24; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
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

async function generateViaRunway(
  req: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  const apiKey = process.env.RUNWAY_API_KEY!;

  const body: Record<string, unknown> = {
    textPrompt: req.prompt,
    seconds: req.durationSeconds,
  };
  if (req.previousFrameUrl) {
    body.initImage = req.previousFrameUrl;
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

function stubVideoResult(req: VideoGenerationRequest): VideoGenerationResult {
  return {
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    durationSeconds: req.durationSeconds,
    provider: "stub",
  };
}

export async function generateVideoClip(
  req: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  if (process.env.SILICONFLOW_API_KEY) {
    return generateViaSiliconFlow(req);
  }

  if (process.env.REPLICATE_API_TOKEN && process.env.VIDEO_MODEL_VERSION) {
    return generateViaReplicate(req);
  }

  if (process.env.RUNWAY_API_KEY) {
    return generateViaRunway(req);
  }

  return stubVideoResult(req);
}

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
