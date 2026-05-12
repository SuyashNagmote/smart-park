import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDb } from './db';

export type User = {
	id: string;
	email: string;
	createdAt: number;
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function now() {
	return Date.now();
}

function randomToken() {
	return crypto.randomBytes(32).toString('hex');
}

function randomId(prefix: string) {
	return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

export function createUser(email: string, password: string): User {
	const db = getDb();
	const passwordHash = bcrypt.hashSync(password, 12);
	const id = randomId('usr');
	const createdAt = now();

	db.prepare(
		`INSERT INTO users (id, email, password_hash, created_at)
		 VALUES (@id, @email, @passwordHash, @createdAt)`,
	).run({ id, email: email.toLowerCase(), passwordHash, createdAt });

	return { id, email: email.toLowerCase(), createdAt };
}

export function verifyUser(email: string, password: string): User | null {
	const db = getDb();
	const row = db
		.prepare(
			`SELECT id, email, password_hash as passwordHash, created_at as createdAt
			 FROM users WHERE email = ?`,
		)
		.get(email.toLowerCase()) as
		| { id: string; email: string; passwordHash: string; createdAt: number }
		| undefined;

	if (!row) return null;
	if (!bcrypt.compareSync(password, row.passwordHash)) return null;
	return { id: row.id, email: row.email, createdAt: row.createdAt };
}

export function createSession(userId: string) {
	const db = getDb();
	const token = randomToken();
	const createdAt = now();
	const expiresAt = createdAt + SESSION_TTL_MS;

	db.prepare(
		`INSERT INTO sessions (token, user_id, expires_at, created_at)
		 VALUES (@token, @userId, @expiresAt, @createdAt)`,
	).run({ token, userId, expiresAt, createdAt });

	return { token, expiresAt };
}

export function deleteSession(token: string) {
	const db = getDb();
	db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function getUserBySession(token: string): User | null {
	const db = getDb();

	// best-effort cleanup
	db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(now());

	const row = db
		.prepare(
			`SELECT u.id as id, u.email as email, u.created_at as createdAt
			 FROM sessions s
			 JOIN users u ON u.id = s.user_id
			 WHERE s.token = ? AND s.expires_at >= ?`,
		)
		.get(token, now()) as User | undefined;

	return row ?? null;
}

/**
 * Find or create a user from a Google OAuth profile.
 * Priority: match by google_id → match by email (link accounts) → create new.
 */
export function findOrCreateGoogleUser(googleId: string, email: string): User {
	const db = getDb();
	const lowerEmail = email.toLowerCase();

	// 1. Already linked by google_id
	const byGoogle = db
		.prepare(
			`SELECT id, email, created_at as createdAt FROM users WHERE google_id = ?`,
		)
		.get(googleId) as User | undefined;

	if (byGoogle) return byGoogle;

	// 2. Existing email-password user → link Google ID
	const byEmail = db
		.prepare(
			`SELECT id, email, created_at as createdAt FROM users WHERE email = ?`,
		)
		.get(lowerEmail) as User | undefined;

	if (byEmail) {
		db.prepare(`UPDATE users SET google_id = ? WHERE id = ?`).run(googleId, byEmail.id);
		return byEmail;
	}

	// 3. Brand new user
	const id = randomId('usr');
	const createdAt = now();

	db.prepare(
		`INSERT INTO users (id, email, password_hash, google_id, created_at)
		 VALUES (@id, @email, @passwordHash, @googleId, @createdAt)`,
	).run({ id, email: lowerEmail, passwordHash: '', googleId, createdAt });

	return { id, email: lowerEmail, createdAt };
}
