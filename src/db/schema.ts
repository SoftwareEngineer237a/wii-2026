import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    badgeType: text("badge_type").notNull(),
    amount: integer("amount").notNull(),
    qrCode: text("qr_code").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "registrations_badge_type_check",
      sql`${table.badgeType} in ('standard', 'vip')`,
    ),
    check(
      "registrations_amount_check",
      sql`(${table.badgeType} = 'standard' and ${table.amount} = 2000) or (${table.badgeType} = 'vip' and ${table.amount} = 5000)`,
    ),
  ],
);

export type RegistrationRow = typeof registrations.$inferSelect;
