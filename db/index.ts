import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { getDatabase } from "./runtime";

export function getDb() {
  return drizzle(getDatabase(), { schema });
}
