import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "wii_admin_session";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET doit contenir au moins 32 caractères.");
  }
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createAdminSession() {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ role: "admin", issuedAt: now, expiresAt: now + ADMIN_SESSION_SECONDS }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function hasAdminSession(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const token = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${ADMIN_COOKIE_NAME}=`))
      ?.slice(ADMIN_COOKIE_NAME.length + 1);

    if (!token) return false;
    const [payload, suppliedSignature, extra] = token.split(".");
    if (!payload || !suppliedSignature || extra) return false;

    const expected = Buffer.from(signature(payload));
    const supplied = Buffer.from(suppliedSignature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      return false;
    }

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: unknown;
      expiresAt?: unknown;
    };
    return session.role === "admin" && typeof session.expiresAt === "number" && session.expiresAt > Date.now() / 1000;
  } catch {
    return false;
  }
}

export function adminCookie(token: string) {
  return `${ADMIN_COOKIE_NAME}=${token}; Path=/; Max-Age=${ADMIN_SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function expiredAdminCookie() {
  return `${ADMIN_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
