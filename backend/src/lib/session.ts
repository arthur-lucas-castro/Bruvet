import type { CookieOptions, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { jwtSecret } from "../config/secrets.js";

export const SESSION_COOKIE = "bruvet_session";

type SessionPayload = { userId: string; tokenVersion: number };

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.COOKIE_SECURE,
  path: "/api",
};

export async function setSessionCookie(res: Response, payload: SessionPayload) {
  const token = await new SignJWT({ v: payload.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_HOURS}h`)
    .sign(jwtSecret);

  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions,
    maxAge: env.SESSION_HOURS * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/** Retorna os dados da sessão, ou null se o token for inválido/expirado. */
export async function readSessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.v !== "number") return null;
    return { userId: payload.sub, tokenVersion: payload.v };
  } catch {
    return null;
  }
}
