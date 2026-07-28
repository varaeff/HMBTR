const { spawnSync } = require('child_process');
const { readFileSync } = require('fs');
const { Client } = require('pg');
const { resolve } = require('path');

const backendRoot = resolve(__dirname, '..');
const envPath = resolve(__dirname, '.env.test');

for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) continue;

  const key = trimmed.slice(0, separatorIndex);
  const value = trimmed.slice(separatorIndex + 1);
  process.env[key] = value;
}

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('hmbtr_test')) {
  throw new Error('Refusing to prepare a non-test database.');
}

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function waitForDatabase() {
  let lastError;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await wait(1000);
    }
  }

  throw lastError;
}

function runPrismaDbPush() {
  const result = spawnSync(
    'npx',
    [
      'prisma',
      'db',
      'push',
      '--force-reset',
      '--schema',
      'prisma/schema.prisma',
    ],
    {
      cwd: backendRoot,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

waitForDatabase()
  .then(runPrismaDbPush)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
