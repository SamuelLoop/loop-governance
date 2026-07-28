import postgres from "postgres";

let _sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!_sql) {
    _sql = postgres(process.env.SUPABASE_DB_POOLER_URL!, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _sql;
}
