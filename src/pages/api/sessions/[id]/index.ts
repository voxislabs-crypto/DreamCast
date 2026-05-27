/**
 * GET /api/sessions/[id]
 * Returns the full session state.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/sessionStore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query as { id: string };
  const session = await getSession(id);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  return res.status(200).json(session);
}
