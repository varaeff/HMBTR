const { spawnSync } = require('child_process');
const { resolve } = require('path');

const backendRoot = resolve(__dirname, '..');

function run(command, args) {
  return spawnSync(command, args, {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

const up = run('docker', ['compose', '-f', 'docker-compose.test.yml', 'up', '-d']);

if (up.status !== 0) {
  process.exit(up.status ?? 1);
}

let exitCode = 0;

try {
  const prepare = run('node', ['test/prepare-integration-db.js']);
  if (prepare.status !== 0) {
    exitCode = prepare.status ?? 1;
  } else {
    const test = run('node', [
      '--experimental-vm-modules',
      './node_modules/jest/bin/jest.js',
      '--config',
      'test/jest-integration.json',
      '--runInBand',
    ]);
    exitCode = test.status ?? 1;
  }
} finally {
  const down = run('docker', [
    'compose',
    '-f',
    'docker-compose.test.yml',
    'down',
    '-v',
  ]);

  if (exitCode === 0 && down.status !== 0) {
    exitCode = down.status ?? 1;
  }
}

process.exit(exitCode);
