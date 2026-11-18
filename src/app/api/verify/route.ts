import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import { hasAdminSession } from "@/lib/session";
import { serializeRegistration } from "@/lib/server-registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CODE_PATTERN = /^WII-[A-HJ-NP-Z2-9]{8}$/;

export async function POST(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, error: "Badge non reconnu — Aucune inscription correspondante." },
      { status: 400 },
    );
  }

  const rawCode =
    body && typeof body === "object" && !Array.isArray(body) && typeof (body as Record<string, unknown>).code === "string"
      ? (body as Record<string, string>).code
      : "";
  const code = rawCode.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    return NextResponse.json(
      { valid: false, error: "Badge non reconnu — Aucune inscription correspondante." },
      { status: 404 },
    );
  }

  try {
    const [row] = await db.select().from(registrations).where(eq(registrations.qrCode, code)).limit(1);
    if (!row) {
      return NextResponse.json(
        { valid: false, error: "Badge non reconnu — Aucune inscription correspondante." },
        { status: 404 },
      );
    }

    const response = NextResponse.json({ valid: true, registration: serializeRegistration(row) });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Badge verification failed", error);
    return NextResponse.json(
      { error: "La vérification est indisponible. Vérifiez la connexion au réseau." },
      { status: 503 },
    );
  }
}
