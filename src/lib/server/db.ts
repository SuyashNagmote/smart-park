import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

let db: Database.Database | null = null;

function getDbPath() {
	// For Vercel demo, use in-memory DB since filesystem is read-only
	if (process.env.VERCEL || process.env.VERCEL_ENV) {
		return ':memory:';
	}

	// keep DB out of src/; safe default for local dev
	const dataDir = path.resolve(process.cwd(), 'data');
	try {
		mkdirSync(dataDir, { recursive: true });
		return path.join(dataDir, 'smartpark.db');
	} catch {
		return ':memory:';
	}
}

function tableColumns(database: Database.Database, table: string): Set<string> {
	try {
		const rows = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
		return new Set(rows.map((r) => r.name));
	} catch {
		return new Set();
	}
}

function tryExec(database: Database.Database, sql: string) {
	try {
		database.exec(sql);
	} catch (e) {
		// best-effort migrations; ignore if already applied or unsupported
	}
}

export function getDb() {
	if (db) return db;

	try {
		db = new Database(getDbPath());
	} catch {
		db = new Database(':memory:');
	}

	db.pragma('journal_mode = WAL');

	db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_booking_day TEXT, -- YYYY-MM-DD
  badges_json TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  receipt_code TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  lot_id TEXT NOT NULL,
  lot_name TEXT NOT NULL,
  lot_area TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  vehicle_type TEXT NOT NULL, -- 'car' | 'ev'
  needs_charging INTEGER NOT NULL DEFAULT 0,
  slot_number INTEGER, -- selected slot (1..capacity)
  start_time INTEGER NOT NULL, -- epoch ms
  duration_hours INTEGER NOT NULL,
  price_per_hour INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'confirmed' | 'cancelled'
  session_status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started' | 'active' | 'completed'
  session_started_at INTEGER,
  session_ended_at INTEGER,
  actual_total_price INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_quests (
  user_id TEXT NOT NULL,
  day_key TEXT NOT NULL, -- YYYY-MM-DD
  quests_json TEXT NOT NULL,
  progress_json TEXT NOT NULL,
  claimed_json TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, day_key),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at);
CREATE INDEX IF NOT EXISTS idx_user_quests_user_day ON user_quests(user_id, day_key);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
`);

	// --- Lightweight migrations for existing DBs ---
	const resCols = tableColumns(db, 'reservations');
	if (!resCols.has('slot_number')) tryExec(db, `ALTER TABLE reservations ADD COLUMN slot_number INTEGER`);
	if (!resCols.has('session_status'))
		tryExec(db, `ALTER TABLE reservations ADD COLUMN session_status TEXT NOT NULL DEFAULT 'not_started'`);
	if (!resCols.has('session_started_at'))
		tryExec(db, `ALTER TABLE reservations ADD COLUMN session_started_at INTEGER`);
	if (!resCols.has('session_ended_at')) tryExec(db, `ALTER TABLE reservations ADD COLUMN session_ended_at INTEGER`);
	if (!resCols.has('actual_total_price'))
		tryExec(db, `ALTER TABLE reservations ADD COLUMN actual_total_price INTEGER`);

	const questCols = tableColumns(db, 'user_quests');
	if (questCols.size === 0) {
		// table didn't exist in old DBs; create (IF NOT EXISTS already ran, but keep for safety)
		tryExec(
			db,
			`CREATE TABLE IF NOT EXISTS user_quests (
        user_id TEXT NOT NULL,
        day_key TEXT NOT NULL,
        quests_json TEXT NOT NULL,
        progress_json TEXT NOT NULL,
        claimed_json TEXT NOT NULL DEFAULT '[]',
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, day_key),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );`,
		);
	}

	return db;
}
