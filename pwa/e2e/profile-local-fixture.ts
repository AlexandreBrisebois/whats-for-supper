import { spawn } from 'node:child_process';
import { mkdtemp, cp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Temporary Next root exercises real client seams without changing route policy. */
export async function startUnselectedProfileFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'wfs-profile-'));
  const pwa = process.cwd();
  await cp(path.join(pwa, 'e2e/fixtures/profile-local/app'), path.join(root, 'app'), {
    recursive: true,
  });
  await symlink(path.join(pwa, 'node_modules'), path.join(root, 'node_modules'));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ private: true }));
  await writeFile(
    path.join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        jsx: 'react-jsx',
        baseUrl: '.',
        paths: { '@/*': [path.join(pwa, 'src/*')] },
      },
    })
  );
  await writeFile(
    path.join(root, 'next.config.js'),
    `module.exports = { experimental: { externalDir: true }, webpack(config) { config.resolve.alias['@'] = ${JSON.stringify(path.join(pwa, 'src'))}; return config; } };`
  );
  const child = spawn(
    process.execPath,
    [path.join(pwa, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-p', '0', root],
    {
      env: { ...process.env, NEXT_PUBLIC_ENVIRONMENT: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const stop = async () => {
    child.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      if (child.exitCode !== null) resolve();
      else child.once('exit', () => resolve());
    });
    await rm(root, { recursive: true, force: true });
  };
  const url = await new Promise<string>((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(
      () => reject(new Error(`Profile fixture startup timed out: ${output}`)),
      20000
    );
    child.stdout.on('data', (data) => {
      output += data.toString();
      const match = output.match(/http:\/\/localhost:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(`http://localhost:${match[1]}`);
      }
    });
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Profile fixture exited ${code}: ${output}`));
    });
  }).catch(async (error) => {
    await stop();
    throw error;
  });
  return { url, stop };
}
