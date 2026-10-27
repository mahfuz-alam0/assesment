import type { Session } from "../types";

interface UserRow {
  id: number;
  password_hash: string;
}

export async function findUserByEmail(db: D1Database, email: string) {
  return db.prepare("SELECT id, password_hash FROM users WHERE email = ?").bind(email).first<UserRow>();
}

export async function createSession(
  db: D1Database,
  id: string,
  userId: number,
  createdAt: number,
  expiresAt: number,
) {
  return db
    .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, userId, expiresAt, createdAt)
    .run();
}

export async function findSession(db: D1Database, id: string) {
  return db
    .prepare(
      `SELECT s.expires_at AS expiresAt, u.id AS userId, u.email, u.role, u.dealership_id AS dealershipId, d.name AS dealership
       FROM sessions s JOIN users u ON u.id = s.user_id JOIN dealerships d ON d.id = u.dealership_id
       WHERE s.id = ?`,
    )
    .bind(id)
    .first<Session & { expiresAt: number }>();
}

export async function deleteSession(db: D1Database, id: string) {
  return db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
}
