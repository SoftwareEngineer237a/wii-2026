import { randomInt } from "node:crypto";
import type { RegistrationRow } from "@/db/schema";
import type { BadgeType, RegistrationView } from "@/lib/types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type RegistrationInput = {
  fullName: string;
  phone: string;
  email: string;
  badgeType: BadgeType;
};

export function validateRegistrationInput(
  value: unknown,
): { ok: true; data: RegistrationInput } | { ok: false; message: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, message: "Vérifiez les informations saisies puis réessayez." };
  }

  const body = value as Record<string, unknown>;
  const fullName = typeof body.fullName === "string" ? body.fullName.trim().replace(/\s+/g, " ") : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const badgeType = body.badgeType;

  if (fullName.length < 2 || fullName.length > 120 || /[\u0000-\u001f\u007f]/.test(fullName)) {
    return { ok: false, message: "Saisissez un nom complet valide (2 à 120 caractères)." };
  }

  const digitCount = phone.replace(/\D/g, "").length;
  if (!/^\+?[0-9][0-9\s().-]{5,30}$/.test(phone) || digitCount < 7 || digitCount > 15) {
    return { ok: false, message: "Saisissez un numéro de téléphone valide (7 à 15 chiffres)." };
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, message: "Saisissez une adresse email valide." };
  }

  if (badgeType !== "standard" && badgeType !== "vip") {
    return { ok: false, message: "Choisissez un type de badge valide." };
  }

  return {
    ok: true,
    data: { fullName, phone, email, badgeType },
  };
}

export function generateRegistrationCode() {
  let suffix = "";
  for (let index = 0; index < 8; index += 1) {
    suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `WII-${suffix}`;
}

export function serializeRegistration(row: RegistrationRow): RegistrationView {
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    badgeType: row.badgeType as BadgeType,
    amount: row.amount,
    qrCode: row.qrCode,
    createdAt: row.createdAt.toISOString(),
  };
}
