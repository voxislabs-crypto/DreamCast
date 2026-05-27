/**
 * Tests for the Consequence & Probability Engine
 */

import {
  calculateProbability,
  resolveOutcome,
  explainOutcome,
  evaluateAction,
} from "@/lib/consequenceEngine";
import type { Avatar } from "@/types";

const strongAvatar: Avatar = {
  name: "Goliath",
  appearance: "A towering warrior",
  skills: { agility: 90, intelligence: 70, charisma: 60, strength: 95 },
  inventory: [],
};

const weakAvatar: Avatar = {
  name: "Apprentice",
  appearance: "A nervous newcomer",
  skills: { agility: 20, intelligence: 30, charisma: 25, strength: 15 },
  inventory: [],
};

describe("calculateProbability", () => {
  it("returns a number between 5 and 95", () => {
    const p = calculateProbability({
      actionText: "I attack the guard",
      avatar: strongAvatar,
    });
    expect(p).toBeGreaterThanOrEqual(5);
    expect(p).toBeLessThanOrEqual(95);
  });

  it("gives a higher chance to a strong avatar in combat vs a weak one", () => {
    const strongP = calculateProbability({
      actionText: "I fight the troll",
      avatar: strongAvatar,
    });
    const weakP = calculateProbability({
      actionText: "I fight the troll",
      avatar: weakAvatar,
    });
    expect(strongP).toBeGreaterThan(weakP);
  });

  it("applies negative environment modifiers (fog, dark)", () => {
    const base = calculateProbability({
      actionText: "I sneak past the guards",
      avatar: strongAvatar,
    });
    const withPenalty = calculateProbability({
      actionText: "I sneak past the guards",
      environmentTags: ["dark", "fog"],
      avatar: strongAvatar,
    });
    expect(withPenalty).toBeLessThan(base);
  });

  it("applies positive environment modifiers (bright, familiar)", () => {
    const base = calculateProbability({
      actionText: "I persuade the merchant",
      avatar: strongAvatar,
    });
    const withBonus = calculateProbability({
      actionText: "I persuade the merchant",
      environmentTags: ["bright", "familiar"],
      avatar: strongAvatar,
    });
    expect(withBonus).toBeGreaterThanOrEqual(base);
  });

  it("clamps probability to minimum 5 even for very weak avatars", () => {
    const p = calculateProbability({
      actionText: "I fight the dragon",
      environmentTags: ["dark", "fog", "rain", "night"],
      avatar: weakAvatar,
    });
    expect(p).toBeGreaterThanOrEqual(5);
  });

  it("clamps probability to maximum 95 even for very strong avatars", () => {
    const godAvatar: Avatar = {
      name: "God",
      appearance: "Omnipotent",
      skills: { agility: 100, intelligence: 100, charisma: 100, strength: 100 },
      inventory: [],
    };
    const p = calculateProbability({
      actionText: "I run",
      environmentTags: ["daylight", "familiar", "home"],
      avatar: godAvatar,
    });
    expect(p).toBeLessThanOrEqual(95);
  });

  it("handles unknown challenge tags by falling back to default profile", () => {
    const p = calculateProbability({
      actionText: "I do something completely random",
      challengeTags: ["totally_unknown_tag"],
      avatar: strongAvatar,
    });
    expect(p).toBeGreaterThanOrEqual(5);
    expect(p).toBeLessThanOrEqual(95);
  });
});

describe("resolveOutcome", () => {
  it("returns true when roll is below probability", () => {
    expect(resolveOutcome(80, 20)).toBe(true); // roll 20 < 80 → success
  });

  it("returns false when roll equals probability", () => {
    expect(resolveOutcome(50, 50)).toBe(false); // roll 50 is NOT < 50
  });

  it("returns false when roll is above probability", () => {
    expect(resolveOutcome(30, 75)).toBe(false);
  });
});

describe("explainOutcome", () => {
  it("mentions the key skill and probability on success", () => {
    const explanation = explainOutcome(
      { actionText: "I fight the guard", avatar: strongAvatar },
      80,
      true
    );
    expect(explanation).toMatch(/80%/);
    expect(explanation.toLowerCase()).toMatch(/success/);
  });

  it("mentions failure on a failed outcome", () => {
    const explanation = explainOutcome(
      { actionText: "I sneak away", avatar: weakAvatar },
      25,
      false
    );
    expect(explanation.toLowerCase()).toMatch(/fail/);
  });

  it("includes environment note when environment tags are present", () => {
    const explanation = explainOutcome(
      {
        actionText: "I sprint",
        environmentTags: ["rain"],
        avatar: strongAvatar,
      },
      60,
      true
    );
    expect(explanation).toMatch(/rain/i);
  });
});

describe("evaluateAction (integration)", () => {
  it("returns a SceneOutcome with all required fields", () => {
    const result = evaluateAction({
      actionText: "I climb the tower",
      avatar: strongAvatar,
    });
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.probability).toBe("number");
    expect(typeof result.explanation).toBe("string");
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it("probability is within [5, 95]", () => {
    const result = evaluateAction({
      actionText: "I negotiate with the merchant",
      avatar: weakAvatar,
    });
    expect(result.probability).toBeGreaterThanOrEqual(5);
    expect(result.probability).toBeLessThanOrEqual(95);
  });
});
