import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: join(__dirname, '.env.test') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !databaseUrl.includes('hmbtr_test')) {
  throw new Error(
    'Integration tests require DATABASE_URL to point to the hmbtr_test database.',
  );
}
