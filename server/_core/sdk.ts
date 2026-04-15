import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  userId: number;
  email: string;
};

class AuthService {
  private getSecret() {
    return new TextEncoder().encode(ENV.jwtSecret);
  }

  async createSessionToken(userId: number, email: string): Promise<string> {
    const secret = this.getSecret();
    return new SignJWT({ userId, email })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime("30d")
      .sign(secret);
  }

  async verifySession(cookieValue: string | undefined | null): Promise<SessionPayload | null> {
    if (!cookieValue) return null;

    try {
      const secret = this.getSecret();
      const { payload } = await jwtVerify(cookieValue, secret, { algorithms: ["HS256"] });
      const { userId, email } = payload as Record<string, unknown>;

      if (typeof userId !== "number" || typeof email !== "string") {
        return null;
      }

      return { userId, email };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User | null> {
    const cookies = parseCookieHeader(req.headers.cookie || "");
    const sessionCookie = cookies[COOKIE_NAME];
    const session = await this.verifySession(sessionCookie);

    if (!session) return null;

    const user = db.getUserById(session.userId);
    return user ?? null;
  }
}

export const sdk = new AuthService();
