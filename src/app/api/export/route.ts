import { desc } from "drizzle-orm";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import { hasAdminSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if (!hasAdminSession(request)) {
    return new Response("Session administrateur requise.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  try {
    const rows = await db.select().from(registrations).orderBy(desc(registrations.createdAt));
    const header = [
      "Numéro",
      "Nom complet",
      "Téléphone",
      "Email",
      "Type de badge",
      "Montant (FCFA)",
      "Code d’inscription",
      "Date d’enregistrement",
    ];
    const lines = [header, ...rows.map((row) => [
      row.id,
      row.fullName,
      row.phone,
      row.email,
      row.badgeType === "vip" ? "VIP" : "Standard",
      row.amount,
      row.qrCode,
      row.createdAt.toISOString(),
    ])].map((cells) => cells.map(csvCell).join(";"));

    return new Response(`\uFEFF${lines.join("\r\n")}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="participantes-women-increase.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("CSV export failed", error);
    return new Response("L’export est indisponible pour le moment.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
