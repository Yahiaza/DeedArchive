import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const run = (cmd, args, allowFailure = false) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0 && !allowFailure) process.exit(result.status ?? 1);
  return result.status === 0;
};

const packagePath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

function nextPatch(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Unsupported version: ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

const requested = process.argv[2]?.replace(/^v/i, '');
const version = requested || nextPatch(pkg.version);
const tag = `v${version}`;

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Version must look like 0.2.7');
  process.exit(1);
}

console.log(`Publishing DeedArchive ${tag}`);

pkg.version = version;
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

run('git', ['add', '.']);
const committed = run('git', ['commit', '-m', `DeedArchive ${tag}`], true);
if (!committed) console.log('No source changes to commit; continuing with push/tag.');
run('git', ['push', 'origin', 'main']);

const tagExists = spawnSync('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], { stdio: 'ignore', shell: process.platform === 'win32' }).status === 0;
if (tagExists) {
  console.error(`Tag ${tag} already exists locally. Use a new version.`);
  process.exit(1);
}

run('git', ['tag', '-a', tag, '-m', `DeedArchive ${tag}`]);
run('git', ['push', 'origin', tag]);

console.log('\nDone. GitHub Actions will build the Portable EXE and create the Release automatically.');
