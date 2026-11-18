import { NextResponse } from "next/server";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import { generateRegistrationCode, serializeRegistration, validateRegistrationInput } from "@/lib/server-registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Le formulaire envoyé est illisible. Réessayez." }, { status: 400 });
  }

  const validation = validateRegistrationInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const { fullName, phone, email, badgeType } = validation.data;
  const amount = badgeType === "vip" ? 5000 : 2000;

  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const qrCode = generateRegistrationCode();
      const [row] = await db
        .insert(registrations)
        .values({ fullName, phone, email, badgeType, amount, qrCode })
        .onConflictDoNothing({ target: registrations.qrCode })
        .returning();

      if (row) {
        return NextResponse.json({ registration: serializeRegistration(row) }, { status: 201 });
      }
    }

    return NextResponse.json(
      { error: "Impossible de générer un code unique pour le moment. Réessayez." },
      { status: 503 },
    );
  } catch (error) {
    console.error("Registration insert failed", error);
    return NextResponse.json(
      { error: "L’inscription n’a pas pu être enregistrée. Vérifiez le réseau puis réessayez." },
      { status: 503 },
    );
  }
}
