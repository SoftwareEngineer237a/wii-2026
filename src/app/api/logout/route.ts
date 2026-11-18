import { NextResponse } from "next/server";
import { expiredAdminCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", expiredAdminCookie());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
