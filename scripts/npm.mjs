// Optional portable entry point for hosts with Node but no npm on PATH.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const cache = path.join(root, '.cache');
const cli = path.join(cache, 'package/bin/npm-cli.js');
if (!existsSync(cli)) {
  mkdirSync(cache, { recursive: true });
  const response = await fetch('https://registry.npmjs.org/npm/12.0.2', { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`npm metadata: HTTP ${response.status}`);
  const metadata = await response.json();
  const archive = await fetch(metadata.dist.tarball, { signal: AbortSignal.timeout(45000) });
  if (!archive.ok) throw new Error(`npm download: HTTP ${archive.status}`);
  const bytes = Buffer.from(await archive.arrayBuffer());
  const [algorithm, digest] = metadata.dist.integrity.split('-');
  if (createHash(algorithm).update(bytes).digest('base64') !== digest) throw new Error('npm integrity mismatch');
  const tarball = path.join(cache, 'npm.tgz');
  writeFileSync(tarball, bytes);
  const extract = spawnSync('tar', ['-xf', tarball, '-C', cache], { stdio: 'inherit' });
  if (extract.status !== 0) throw new Error('Cannot extract portable npm');
}
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
