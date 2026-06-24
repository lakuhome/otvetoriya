function getRequiredEnv(name) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const env = {
  port: Number(process.env.PORT) || 3000,
  clientUrl: process.env.CLIENT_URL || '*',
  jwtSecret: getRequiredEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  dbHost: getRequiredEnv('DB_HOST'),
  dbPort: Number(process.env.DB_PORT) || 5432,
  dbName: getRequiredEnv('DB_NAME'),
  dbUser: getRequiredEnv('DB_USER'),
  dbPassword: getRequiredEnv('DB_PASSWORD'),
};

module.exports = { env };

