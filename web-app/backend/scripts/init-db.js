import { config } from '../src/config.js';
import { closeDatabase, getDatabase, initializeDatabase } from '../src/db/database.js';

const db = initializeDatabase(getDatabase());
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((row) => row.name);

console.log(`SQLite database initialized: ${config.dbPath}`);
console.log(`Tables: ${tables.join(', ')}`);

closeDatabase();
