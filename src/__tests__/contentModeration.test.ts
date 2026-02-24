/**
 * Tests for the Content Moderation module
 */

import { passesBlocklist } from "@/lib/contentModeration";

describe("passesBlocklist", () => {
  it("allows normal adventure text", () => {
    expect(passesBlocklist("I explore the ancient ruins")).toBe(true);
    expect(passesBlocklist("You step into the rain-soaked alley")).toBe(true);
    expect(passesBlocklist("I negotiate with the merchant")).toBe(true);
  });

  it("blocks content matching hard-coded patterns", () => {
    expect(passesBlocklist("csam content")).toBe(false);
    expect(passesBlocklist("child porn")).toBe(false);
    expect(passesBlocklist("underage sex")).toBe(false);
  });

  it("is case-insensitive for blocked terms", () => {
    expect(passesBlocklist("CSAM")).toBe(false);
    expect(passesBlocklist("Child Porn")).toBe(false);
  });

  it("allows edge-case innocent text containing partial matches", () => {
    // "underage" alone is not in the blocklist — only "underage sex" pattern
    expect(passesBlocklist("underage drinking policy")).toBe(true);
  });
});
