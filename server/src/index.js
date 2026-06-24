require('dotenv').config();

const http = require('http');

const { env } = require('./config/env');
const app = require('./app');
const { testDatabaseConnection } = require('./db/pool');
const { createSocketServer } = require('./socket/server');

async function start() {
  await testDatabaseConnection();

  const httpServer = http.createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server');
  console.error(error);
  process.exit(1);
});
