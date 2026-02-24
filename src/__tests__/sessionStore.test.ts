/**
 * Tests for the Session Store
 */

import {
  getSession,
  saveSession,
  deleteSession,
  listSessionsForUser,
} from "@/lib/sessionStore";
import type { Session } from "@/types";

function makeSession(id: string, userId: string): Session {
  return {
    id,
    userId,
    genre: "fantasy",
    avatar: {
      name: "Hero",
      appearance: "Brave",
      skills: { agility: 60, intelligence: 60, charisma: 60, strength: 60 },
      inventory: [],
    },
    scenes: [],
    status: "active",
    tier: "free",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("sessionStore", () => {
  it("returns null for a non-existent session", async () => {
    const result = await getSession("does-not-exist");
    expect(result).toBeNull();
  });

  it("saves and retrieves a session", async () => {
    const session = makeSession("session-1", "user-a");
    await saveSession(session);
    const retrieved = await getSession("session-1");
    expect(retrieved).toEqual(session);
  });

  it("overwrites an existing session on save", async () => {
    const session = makeSession("session-2", "user-b");
    await saveSession(session);

    const updated = { ...session, status: "paused" as const };
    await saveSession(updated);

    const retrieved = await getSession("session-2");
    expect(retrieved?.status).toBe("paused");
  });

  it("deletes a session", async () => {
    const session = makeSession("session-3", "user-c");
    await saveSession(session);
    await deleteSession("session-3");
    const retrieved = await getSession("session-3");
    expect(retrieved).toBeNull();
  });

  it("lists sessions for a specific user", async () => {
    const s1 = makeSession("session-u1-a", "user-list");
    const s2 = makeSession("session-u1-b", "user-list");
    const s3 = makeSession("session-other", "user-other");
    await saveSession(s1);
    await saveSession(s2);
    await saveSession(s3);

    const userSessions = await listSessionsForUser("user-list");
    const ids = userSessions.map((s) => s.id);
    expect(ids).toContain("session-u1-a");
    expect(ids).toContain("session-u1-b");
    expect(ids).not.toContain("session-other");
  });
});
