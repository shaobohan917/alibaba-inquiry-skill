import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { schemaStatements, seedStatements, triggerStatements } from './schema.js';

let connection;

export function getDatabase(dbPath = config.dbPath) {
  if (connection) {
    return connection;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  connection = new Database(dbPath);
  connection.pragma('foreign_keys = ON');
  connection.pragma('journal_mode = WAL');
  connection.pragma('busy_timeout = 5000');

  return connection;
}

export function initializeDatabase(db = getDatabase()) {
  const migrate = db.transaction(() => {
    for (const statement of schemaStatements) {
      db.exec(statement);
    }

    for (const statement of triggerStatements) {
      db.exec(statement);
    }

    for (const seed of seedStatements) {
      db.prepare(seed.sql).run(seed.params);
    }
  });

  migrate();
  return db;
}

export function closeDatabase() {
  if (connection) {
    connection.close();
    connection = undefined;
  }
}
