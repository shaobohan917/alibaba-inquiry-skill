import { config } from './config.js';
import { closeDatabase, getDatabase, initializeDatabase } from './db/database.js';
import { createRepositories } from './repositories/index.js';
import { createApp } from './app.js';

const db = initializeDatabase(getDatabase());
const app = createApp(createRepositories(db));

const server = app.listen(config.port, config.host, () => {
  console.log(`API server listening on http://${config.host}:${config.port}`);
  console.log(`SQLite database: ${config.dbPath}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down API server`);
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
