/**
 * Anonymous identity / 匿名身分 (BUILD_PLAN §19)
 *
 * Identity comes from a signed, httpOnly cookie — never from a player ID the
 * client supplies. This stands in for Supabase Anonymous Auth behind the same
 * boundary, so swapping it out does not change any route's contract.
 *
 * 身分取自簽章 httpOnly cookie，不信任前端提供的 ID。
 */

import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "mkk_uid";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function sessionSecret(): string {
  const secret = process.env.MKK_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("MKK_SESSION_SECRET must be set in production");
  }
  return "dev-only-insecure-secret";
}

function sign(userId: string): string {
  return crypto
    .createHmac("sha256", sessionSecret())
    .update(userId)
    .digest("base64url");
}

function serialize(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

function verify(value: string): string | null {
  const cut = value.lastIndexOf(".");
  if (cut <= 0) return null;
  const userId = value.slice(0, cut);
  const provided = value.slice(cut + 1);
  const expected = sign(userId);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return crypto.timingSafeEqual(a, b) ? userId : null;
}

/** Read the caller's identity without creating one. */
export async function getUserId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  return raw ? verify(raw) : null;
}

/**
 * Read the caller's identity, minting one if absent.
 * Only callable from a Route Handler or Server Action (it may set a cookie).
 */
export async function getOrCreateUserId(): Promise<string> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (raw) {
    const existing = verify(raw);
    if (existing) return existing;
  }
  const userId = crypto.randomUUID();
  jar.set(COOKIE_NAME, serialize(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return userId;
}
