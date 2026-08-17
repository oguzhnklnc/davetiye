import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const rsvps = sqliteTable("rsvps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", { enum: ["attending", "maybe", "declined"] }).notNull(),
  guestCount: integer("guest_count").notNull().default(0),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_rsvps_status").on(table.status), index("idx_rsvps_created_at").on(table.createdAt)]);

export const mediaLinks = sqliteTable("media_links", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_media_links_created_at").on(table.createdAt)]);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
