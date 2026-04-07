import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { logger } from '../logger/logger';

let db: Database<sqlite3.Database, sqlite3.Statement>;

export async function initDB(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  logger.info({ event: "Initalizing SQLite database connection..." });
  if (!db) {
    db = await open({
      filename: path.join(__dirname, '../../data/emails.db'),
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS processed_emails (
        gmail_message_id TEXT PRIMARY KEY,
        processed_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS history_tracker (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_history_id TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO history_tracker (id, last_history_id) 
      VALUES (1, '0');
    `);
  }
  return db;
}

export async function isProcessed(messageId: string): Promise<boolean> {
  logger.debug({ event: "Invoke isProcessed: Check for messageId", messageId })
  const row = await db.get(
    `SELECT gmail_message_id FROM processed_emails WHERE gmail_message_id = ?`,
    [messageId]
  );
  return !!row;
}

export async function markProcessed(messageId: string): Promise<void> {
  logger.debug({ event: "Invoke markProcessed: Marking message as processed", messageId });
  await db.run(
    `INSERT OR IGNORE INTO processed_emails (gmail_message_id) VALUES (?)`,
    [messageId]
  );
}

export async function getLastHistoryId(): Promise<string> {
  const row = await db.get(`SELECT last_history_id FROM history_tracker WHERE id = 1`);
  logger.debug({ event: "Invoke getLastHistoryId: Fetched last history ID from DB cache", historyId: row.last_history_id });
  return row.last_history_id;
}

export async function updateLastHistoryId(historyId: string): Promise<void> {
  logger.debug({ event: "Invoke updateLastHistoryId: Updating last history ID", historyId });
  await db.run(
    `UPDATE history_tracker SET last_history_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    [historyId]
  );
}

