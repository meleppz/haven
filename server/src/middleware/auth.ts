import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { unauthorized } from "../lib/errors.js";

export type Auth = { userId: string; clientId: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: Auth;
    }
  }
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: "30d" });
}

/** BR-01: the caller must be authenticated. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw unauthorized();
  let sub: string;
  try {
    const p = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    sub = String(p.sub);
  } catch {
    throw unauthorized("Sesimu sudah berakhir, silakan masuk lagi ya.");
  }
  const client = await prisma.client.findUnique({ where: { userId: sub }, select: { id: true } });
  if (!client) throw unauthorized();
  req.auth = { userId: sub, clientId: client.id };
  next();
}

export const authOf = (req: Request): Auth => {
  if (!req.auth) throw unauthorized();
  return req.auth;
};
