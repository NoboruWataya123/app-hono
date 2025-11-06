import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from '../../config/env';

/**
 * PostgreSQL client instance
 */
export const client = postgres(config.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Drizzle ORM instance
 */
export const db = drizzle(client, { schema });

/**
 * Close database connection
 */
export async function closeDatabase() {
  await client.end();
}
