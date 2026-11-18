import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import { hasAdminSession } from "@/lib/session";
import { serializeRegistration } from "@/lib/server-registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
  }

  try {
    const rows = await db.select().from(registrations).orderBy(desc(registrations.createdAt));
    const stats = rows.reduce(
      (totals, row) => {
        totals.total += 1;
        if (row.badgeType === "standard") totals.standard += 1;
        if (row.badgeType === "vip") totals.vip += 1;
        return totals;
      },
      { total: 0, standard: 0, vip: 0 },
    );

    const response = NextResponse.json({ registrations: rows.map(serializeRegistration), stats });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Admin registration list failed", error);
    return NextResponse.json(
      { error: "La liste est indisponible. Vérifiez la connexion à la base de données." },
      { status: 503 },
    );
  }
}
