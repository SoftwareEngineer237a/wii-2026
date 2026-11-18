import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminCookie, createAdminSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expectedPin = process.env.ADMIN_PIN ?? "";
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  if ((!/^\d{4,5}$/.test(expectedPin) && expectedPin !== "admin") || sessionSecret.length < 32) {
    return NextResponse.json(
      { error: "L’accès administrateur n’est pas configuré sur le serveur." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Saisissez votre code administrateur." }, { status: 400 });
  }

  const suppliedPin =
    body && typeof body === "object" && !Array.isArray(body) && typeof (body as Record<string, unknown>).pin === "string"
      ? ((body as Record<string, string>).pin ?? "")
      : "";
  const supplied = Buffer.from(suppliedPin);
  const expected = Buffer.from(expectedPin);
  const matches = supplied.length === expected.length && timingSafeEqual(supplied, expected);

  if (!matches) {
    return NextResponse.json({ error: "Code administrateur incorrect." }, { status: 401 });
  }

  try {
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", adminCookie(createAdminSession()));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      { error: "La session administrateur n’a pas pu être créée." },
      { status: 503 },
    );
  }
}
