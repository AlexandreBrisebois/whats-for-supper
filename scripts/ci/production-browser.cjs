// Shared local/hosted production browser owner. No external server is reused.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const { spawnSync } = require('node:child_process');
const { suites, inventory, validateInventory } = require('./e2e-suites.cjs');

const root = path.resolve(__dirname, '../..');
const pwa = path.join(root, 'pwa');
const settings = Object.freeze({
  CI: 'true', HEARTH_SECRET: 'Paris-Montreal',
  NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:5001',
  API_INTERNAL_URL: 'http://127.0.0.1:5001',
  NEXT_PUBLIC_ENABLE_AGENT_SEARCH: 'true', NEXT_PUBLIC_ENABLE_PHOTO_SEARCH: 'true',
});
const buildRecord = path.join(pwa, '.next/wfs-browser-build.json');
const configurationDigest = crypto.createHash('sha256').update(JSON.stringify(settings)).digest('hex');

function environment(suite) {
  const env = { ...process.env, ...settings };
  for (const key of ['BASE_URL', 'WFS_E2E_SUITE', 'WFS_PUSH_E2E_SUITES', 'CALENDAR_API_URL', 'TONIGHT_API_URL', 'TOMORROW_API_URL', 'NODE_ENV', 'NEXT_PUBLIC_ENVIRONMENT']) delete env[key];
  if (suite) env.WFS_E2E_SUITE = suite;
  return env;
}

function digest(paths, excluded = new Set()) {
  const hash = crypto.createHash('sha256');
  function add(file) {
    const relative = path.relative(root, file);
    if (excluded.has(relative) || !fs.existsSync(file)) return;
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error(`Unexpected linked build input: ${relative}`);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(file).sort()) add(path.join(file, name));
    } else hash.update(relative + '\0').update(fs.readFileSync(file)).update('\0');
  }
  for (const file of [...paths].sort()) add(path.join(root, file));
  return hash.digest('hex');
}

function sourceDigest() {
  return digest(['.nvmrc', 'Taskfile.yml', '.github/workflows/validate.yml', 'scripts/ci',
    ...fs.readdirSync(pwa).filter(name => name.startsWith('.env') || name.startsWith('.prettier')).map(name => `pwa/${name}`),
    ...fs.readdirSync(pwa).filter(name => !name.startsWith('.') && name !== 'node_modules' &&
      !['test-results', 'playwright-report', 'blob-report', 'next-env.d.ts', 'tsconfig.tsbuildinfo'].includes(name))
      .map(name => `pwa/${name}`)]);
}

function artifactDigest() {
  return digest(['pwa/.next'], new Set(['pwa/.next/wfs-browser-build.json', 'pwa/.next/cache', 'pwa/.next/trace']));
}

function toolVersion(command, args) {
  const result = spawnSync(command, args, { cwd: pwa, env: environment(), encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Cannot identify ${command}: ${result.error?.message || result.stderr}`);
  return result.stdout.trim();
}

function runtime() {
  const npm = toolVersion('npm', ['--version']);
  const pinnedNode = fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim().replace(/^v/, '');
  if (process.versions.node !== pinnedNode || npm !== '11.21.1')
    throw new Error(`Production qualification requires Node ${pinnedNode} and npm 11.21.1; found Node ${process.versions.node}, npm ${npm}`);
  const versions = {};
  for (const name of ['next', '@playwright/test']) {
    const file = path.join(pwa, 'node_modules', name, 'package.json');
    versions[name] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)).version : null;
  }
  return { node: process.versions.node, npm, platform: process.platform, arch: process.arch, versions };
}

function candidate() {
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : null;
  };
  return { commit: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'),
    dirtyPaths: git('status', '--porcelain=v1'),
    range: process.env.WFS_BROWSER_RANGE ? JSON.parse(process.env.WFS_BROWSER_RANGE) : null };
}

function browserIdentity() {
  const file = path.join(pwa, 'node_modules/playwright-core/browsers.json');
  if (!fs.existsSync(file)) return null; // Command fixtures have no browser installation.
  const entries = JSON.parse(fs.readFileSync(file)).browsers;
  return entries.filter(browser => browser.name.startsWith('chromium')).map(({ name, revision, browserVersion }) => ({ name, revision, browserVersion }));
}

function child(args, suite) {
  const result = spawnSync('npm', args, { cwd: pwa, env: environment(suite), stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

async function requireFreePort() {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', error => reject(new Error(`Production browser port 3000 is unavailable (${error.code}); use a task-owned isolated runtime. No process was stopped.`)));
    probe.listen(3000, '127.0.0.1', () => probe.close(resolve));
  });
}

function save(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function outcomes(report) {
  const counts = { firstAttemptFailures: 0, retryPasses: 0, retries: 0, skipped: 0 };
  function visit(suite) {
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      const results = test.results ?? [];
      const expected = test.expectedStatus ?? 'passed';
      if (results[0]?.status === 'skipped') counts.skipped++;
      else if (results[0] && results[0].status !== expected) counts.firstAttemptFailures++;
      counts.retries += Math.max(0, results.length - 1);
      if (results.length > 1 && results.at(-1).status === expected) counts.retryPasses++;
    }
    for (const nested of suite.suites ?? []) visit(nested);
  }
  visit(report);
  return counts;
}

async function main(args) {
  const operation = args.shift();
  if (!['build', 'run', 'qualify', 'check'].includes(operation)) throw new Error('Use build, run, qualify or check [--suites "planning recipes"] [-- Playwright arguments]');
  let selected = Object.keys(suites);
  const explicitSuites = args[0] === '--suites';
  if (args[0] === '--suites') {
    args.shift();
    const value = args.shift();
    if (!value?.trim()) throw new Error('At least one E2E suite is required');
    selected = value === 'all' ? Object.keys(suites) : [...new Set(value.trim().split(/\s+/))];
  }
  if (selected.some(suite => !Object.hasOwn(suites, suite))) throw new Error(`Unknown E2E suite: ${selected.join(' ')}`);
  if (args[0] === '--') args.shift();
  if (!explicitSuites && args.length) selected = ['all'];
  if (args.some(arg => arg.startsWith('--config') || arg.startsWith('--ui') || arg.startsWith('--debug')))
    throw new Error('Production qualification must use the managed Playwright configuration');
  validateInventory(inventory());
  await requireFreePort();
  const tools = runtime();
  const initialSource = sourceDigest();
  const id = crypto.randomUUID();
  const directory = path.join(root, '.task/production-browser/runs', id);
  const option = (name, fallback) => {
    const index = args.findLastIndex(arg => arg === name || arg.startsWith(name + '='));
    return index < 0 ? fallback : args[index].includes('=') ? args[index].split('=')[1] : args[index + 1];
  };
  const record = { id, operation, sourceDigest: initialSource, candidate: candidate(),
    configurationDigest,
    settings: { ...settings, HEARTH_SECRET: '[synthetic test secret]' },
    runtime: tools, browser: browserIdentity(), suites: selected,
    execution: { workers: option('--workers', 4), retries: option('--retries', 1), managedServer: true, mode: 'production' },
    arguments: args, startedAt: new Date().toISOString(), results: [] };
  const recordPath = path.join(directory, 'result.json');
  save(recordPath, record);
  console.log(`Production browser record: ${recordPath}`);
  let exit = 0;
  try {
    if (operation === 'check') {
      for (const step of ['format:check', 'lint', 'typecheck', 'test:unit']) {
        exit = child(['run', step]);
        if (exit) return exit;
      }
    }
    if (operation !== 'run') {
      fs.rmSync(path.join(pwa, '.next'), { recursive: true, force: true });
      exit = child(['run', 'build']);
      if (exit) return exit;
      if (sourceDigest() !== initialSource) throw new Error('Source changed during production build');
      save(buildRecord, { sourceDigest: initialSource, settings, runtime: tools,
        candidate: record.candidate, configurationDigest,
        buildId: fs.readFileSync(path.join(pwa, '.next/BUILD_ID'), 'utf8').trim(), artifactDigest: artifactDigest() });
    }
    const built = JSON.parse(fs.readFileSync(buildRecord, 'utf8'));
    if (built.sourceDigest !== initialSource || JSON.stringify(built.settings) !== JSON.stringify(settings) ||
        JSON.stringify(built.runtime) !== JSON.stringify(tools) || built.artifactDigest !== artifactDigest())
      throw new Error('Production build/source/configuration/runtime identity mismatch; build this candidate again');
    record.build = built;
    if (operation === 'build') return 0;
    for (const suite of selected) {
      await requireFreePort();
      const output = path.join(pwa, 'test-results/results.json');
      fs.rmSync(output, { force: true });
      const status = child(['run', 'test:e2e', '--', '--trace=retain-on-failure', ...args], suite);
      let summary = null;
      if (fs.existsSync(output)) {
        const result = JSON.parse(fs.readFileSync(output, 'utf8'));
        summary = { ...result.stats, ...outcomes(result) };
        fs.copyFileSync(output, path.join(directory, `${suite}.results.json`));
      }
      record.results.push({ suite, exitCode: status, summary });
      // A later suite clears Playwright's output directories. Keep every first
      // attempt/retry diagnostic and blob alongside the invocation record.
      for (const name of ['test-results', 'blob-report']) {
        const artifacts = path.join(pwa, name);
        if (fs.existsSync(artifacts)) fs.cpSync(artifacts, path.join(directory, suite, name), { recursive: true });
      }
      save(recordPath, record);
      if (!status && !summary) throw new Error(`Missing Playwright result record for ${suite}`);
      if (sourceDigest() !== initialSource) throw new Error('Source changed during production browser verification');
      if (status) { exit = status; return exit; }
    }
    return 0;
  } catch (error) {
    exit = 1;
    record.error = error.message;
    throw error;
  } finally {
    record.exitCode = exit;
    record.finishedAt = new Date().toISOString();
    save(recordPath, record);
    save(path.join(pwa, 'test-results/production-browser', `${id}.json`), record);
  }
}

module.exports = { environment, sourceDigest, main };
if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 1; });
