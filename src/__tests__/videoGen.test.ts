/**
 * Tests for the Video Generation utility functions
 */

import { narrativeToVideoPrompt } from "@/lib/videoGen";

describe("narrativeToVideoPrompt", () => {
  it("replaces 'You' with 'The protagonist'", () => {
    const prompt = narrativeToVideoPrompt(
      "You stand at the edge of the cliff, wind whipping past your face.",
      "adventure"
    );
    expect(prompt).toContain("The protagonist");
    expect(prompt).not.toContain(" You ");
  });

  it("replaces 'your' with 'their'", () => {
    const prompt = narrativeToVideoPrompt(
      "Your sword gleams in the moonlight.",
      "fantasy"
    );
    expect(prompt).toContain("their");
  });

  it("includes the genre in the prompt", () => {
    const prompt = narrativeToVideoPrompt("You walk forward.", "sci-fi");
    expect(prompt).toContain("sci-fi");
  });

  it("truncates very long narrative text to 300 characters", () => {
    const longText = "You ".repeat(200);
    const prompt = narrativeToVideoPrompt(longText, "thriller");
    // The prompt prefix is "Cinematic thriller scene, 720p, photoreal: " (43 chars)
    // The narrative portion should be at most 300 chars
    const narrativePart = prompt.replace(/^Cinematic .+?: /, "");
    expect(narrativePart.length).toBeLessThanOrEqual(300);
  });
});
