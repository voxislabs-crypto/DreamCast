/**
 * Session Store
 *
 * Lightweight in-process session store for development and testing.
 * In production, replace this with a Supabase / Firestore adapter by
 * implementing the same SessionStore interface and swapping the import
 * in the API routes.
 */

import type { Session } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store (development / testing)
// ─────────────────────────────────────────────────────────────────────────────

const store = new Map<string, Session>();

export async function getSession(id: string): Promise<Session | null> {
  return store.get(id) ?? null;
}

export async function saveSession(session: Session): Promise<void> {
  store.set(session.id, session);
}

export async function deleteSession(id: string): Promise<void> {
  store.delete(id);
}

export async function listSessionsForUser(userId: string): Promise<Session[]> {
  return Array.from(store.values()).filter((s) => s.userId === userId);
}
