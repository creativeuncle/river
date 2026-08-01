import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env var is required");
}

export interface AgentAuthPayload {
  agentId: string;
  accountId: string;
  name: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      agent?: AgentAuthPayload;
    }
  }
}

export function signAgentToken(payload: AgentAuthPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "30d" });
}

export function verifyAgentToken(token: string): AgentAuthPayload {
  return jwt.verify(token, JWT_SECRET as string) as AgentAuthPayload;
}

export function requireAgent(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  try {
    req.agent = verifyAgentToken(header.slice("Bearer ".length));
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Role can be changed after a token was issued, so this always checks the
// agent's current role in the DB rather than trusting the JWT payload.
// Must run after requireAgent.
export function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const agent = await prisma.agent.findUnique({ where: { id: req.agent!.agentId }, select: { role: true } });
    if (!agent || !roles.includes(agent.role)) {
      return res.status(403).json({ error: "You don't have permission to do this" });
    }
    next();
  };
}

// Platform-admin only (cross-account), unrelated to a normal account's own
// Owner/Admin/Agent role. Always checked fresh from the DB — never trust the
// JWT for this. Must run after requireAgent.
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const agent = await prisma.agent.findUnique({ where: { id: req.agent!.agentId }, select: { isSuperAdmin: true } });
  if (!agent?.isSuperAdmin) {
    return res.status(403).json({ error: "You don't have permission to do this" });
  }
  next();
}
