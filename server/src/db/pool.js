const { Pool } = require('pg');
const { env } = require('../config/env');

const pool = new Pool({
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword,
});

async function query(text, params) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

async function testDatabaseConnection() {
  await pool.query('SELECT 1');
}

module.exports = {
  pool,
  query,
  getClient,
  testDatabaseConnection,
};
