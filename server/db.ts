import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Production-ready database connection pool with optimal settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait for a connection to become available
  statement_timeout: 10000, // Timeout for statements in ms (10s)
  query_timeout: 15000, // Timeout for queries in ms (15s)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined, // Enable SSL in production
});

// Enable query logging in development environment
const shouldLogQueries = process.env.NODE_ENV === 'development';

// Create a drizzle instance with the optimized pool
export const db = drizzle({ 
  client: pool, 
  schema,
  logger: shouldLogQueries ? {
    logQuery: (query, params) => {
      console.log('Query:', query);
      if (params) console.log('Params:', params);
    },
  } : undefined,
});

// Setup graceful shutdown handling for the database pool
process.on('SIGINT', () => {
  console.log('Gracefully shutting down...');
  pool.end().then(() => {
    console.log('Database pool closed successfully');
    process.exit(0);
  }).catch(err => {
    console.error('Error closing database pool:', err);
    process.exit(1);
  });
});