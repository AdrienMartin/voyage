const DEFAULT_DATABASE_URL = "postgresql://voyage:voyage@localhost:5432/voyage";

export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

