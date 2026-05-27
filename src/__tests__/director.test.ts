import { decideRenderMode } from "@/lib/director";

describe("decideRenderMode", () => {
  it("uses text-only mode when video is not enabled", () => {
    const decision = decideRenderMode({
      tier: "free",
      sceneNumber: 1,
      clipsUsed: 0,
      maxClipsPerSession: 2,
      videoEnabled: false,
    });

    expect(decision.renderMode).toBe("text_only");
    expect(decision.shouldGenerateVideo).toBe(false);
  });

  it("spends video on an opening scene when video is enabled", () => {
    const decision = decideRenderMode({
      tier: "basic",
      sceneNumber: 1,
      clipsUsed: 0,
      maxClipsPerSession: 10,
      videoEnabled: true,
    });

    expect(decision.renderMode).toBe("video");
    expect(decision.shouldGenerateVideo).toBe(true);
  });

  it("saves clip budget for text-friendly scenes", () => {
    const decision = decideRenderMode({
      tier: "basic",
      sceneNumber: 3,
      clipsUsed: 1,
      maxClipsPerSession: 10,
      videoEnabled: true,
      environmentTags: ["dialogue"],
    });

    expect(decision.renderMode).toBe("ambient_image");
    expect(decision.shouldGenerateVideo).toBe(false);
  });
});
