import { serial, uuid, timestamp } from "drizzle-orm/pg-core";

export function baseColumns() {
  return {
    id: serial("id").primaryKey(),
    externalId: uuid("external_id").notNull().unique().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  };
}
