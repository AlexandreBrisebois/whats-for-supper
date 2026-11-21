const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const realNpm = spawnSync('which', ['npm'], { encoding: 'utf8' }).stdout.trim();
const realTask = spawnSync('which', ['task'], { encoding: 'utf8' }).stdout.trim();

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wfs-production-browser-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const name of ['scripts/ci', 'pwa/e2e', 'bin']) fs.mkdirSync(path.join(dir, name), { recursive: true });
  fs.cpSync(__dirname, path.join(dir, 'scripts/ci'), { recursive: true });
  fs.copyFileSync(path.join(root, 'Taskfile.yml'), path.join(dir, 'Taskfile.yml'));
  fs.copyFileSync(path.join(root, 'pwa/package.json'), path.join(dir, 'pwa/package.json'));
  fs.writeFileSync(path.join(dir, '.nvmrc'), process.versions.node);
  const { suites } = require('./e2e-suites.cjs');
  for (const name of Object.values(suites).flat()) fs.writeFileSync(path.join(dir, 'pwa/e2e', `${name}.spec.ts`), '');
  const log = path.join(dir, 'calls.jsonl');
  // Command tests use task/npm/port doubles; actual build/start/browser acceptance
  // runs separately in an owned runtime with a free port 3000.
  const preload = path.join(dir, 'port-double.cjs');
  fs.writeFileSync(preload, `const {EventEmitter}=require('node:events');
require('node:net').createServer=()=>{const server=new EventEmitter();
server.listen=(_port,_host,ready)=>{queueMicrotask(()=>process.env.FIXTURE_OCCUPIED ? server.emit('error',Object.assign(new Error('occupied'),{code:'EADDRINUSE'})):ready());};
server.close=done=>queueMicrotask(done);return server;};`);
  fs.writeFileSync(path.join(dir, 'bin/npm'), `#!${process.execPath}
const fs = require('node:fs');
if(process.argv.includes('--version')) { console.log('11.21.1'); process.exit(0); }
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify({args:process.argv.slice(2), CI:process.env.CI, BASE_URL:process.env.BASE_URL, suite:process.env.WFS_E2E_SUITE, api:process.env.NEXT_PUBLIC_API_BASE_URL})+'\\n');
if(process.argv.includes('build')) {fs.mkdirSync('.next',{recursive:true});fs.writeFileSync('.next/BUILD_ID','fixture-build');}
if(process.argv.includes('test:e2e')) {fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/results.json',JSON.stringify({stats:{expected:1,unexpected:0,flaky:0,skipped:0}}));fs.writeFileSync('test-results/trace-fixture.txt','retained diagnostic');fs.mkdirSync('blob-report',{recursive:true});fs.writeFileSync('blob-report/report.zip','blob fixture');}
process.exit(Number(process.env.CHILD_EXIT || 0));
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${dir}/bin:${process.env.PATH}`, CALL_LOG: log, NODE_OPTIONS: `--require=${preload}` };
  for (const key of ['CI', 'BASE_URL', 'WFS_E2E_SUITE', 'WFS_PUSH_E2E_SUITES']) delete env[key];
  return { dir, env, calls: () => fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse) : [] };
}

test('unknown and empty suites fail before any build or browser child', (t) => {
  const f = fixture(t);
  for (const suite of ['unknown', '']) {
    const result = spawnSync(process.execPath, ['scripts/ci/production-browser.cjs', 'qualify', '--suites', suite], { cwd: f.dir, env: f.env, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown E2E suite|At least one E2E suite/);
  }
  assert.deepEqual(f.calls(), []);
});

test('occupied port fails before starting children or stopping a process', (t) => {
  const f = fixture(t);
  const result = spawnSync(process.execPath, ['scripts/ci/production-browser.cjs', 'qualify'], { cwd: f.dir, env: { ...f.env, FIXTURE_OCCUPIED: 'true' }, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /port 3000 is unavailable/);
  assert.deepEqual(f.calls(), []);
});

test('build child failure propagates and leaves no reusable artifact identity', (t) => {
  const f = fixture(t);
  const result = spawnSync(process.execPath, ['scripts/ci/production-browser.cjs', 'qualify'], { cwd: f.dir, env: { ...f.env, CHILD_EXIT: '17' }, encoding: 'utf8' });
  assert.equal(result.status, 17, result.stderr);
  assert.equal(fs.existsSync(path.join(f.dir, 'pwa/.next/wfs-browser-build.json')), false);
  assert.equal(f.calls().filter(c => c.args.includes('test:e2e')).length, 0);
});

function owner(f, operation, extra = [], env = {}) {
  return spawnSync(process.execPath, ['scripts/ci/production-browser.cjs', operation, ...extra], {
    cwd: f.dir, env: { ...f.env, ...env }, encoding: 'utf8',
  });
}

test('transferred build identity is reusable only for the same source and artifact', (t) => {
  const built = fixture(t), worker = fixture(t);
  let result = owner(built, 'build');
  assert.equal(result.status, 0, result.stderr);
  fs.cpSync(path.join(built.dir, 'pwa/.next'), path.join(worker.dir, 'pwa/.next'), { recursive: true });
  result = owner(worker, 'run', ['--suites', 'planning']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(worker.calls().filter(c => c.args.includes('build')).length, 0);
  const records = fs.readdirSync(path.join(worker.dir, 'pwa/test-results/production-browser'));
  assert.ok(records.length > 0, 'run identity must survive CI artifact upload');
  fs.appendFileSync(path.join(worker.dir, 'pwa/e2e/planner.spec.ts'), '// later source');
  result = owner(worker, 'run', ['--suites', 'planning']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /identity mismatch/);
});

test('modified build bytes are rejected before browser execution', (t) => {
  const f = fixture(t);
  assert.equal(owner(f, 'build').status, 0);
  fs.writeFileSync(path.join(f.dir, 'pwa/.next/BUILD_ID'), 'external-build');
  const result = owner(f, 'run', ['--suites', 'recipes']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /identity mismatch/);
  assert.equal(f.calls().filter(c => c.args.includes('test:e2e')).length, 0);
});

test('fresh qualification discards prior generated output before building', (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.dir, 'pwa/.next/cache'), { recursive: true });
  fs.writeFileSync(path.join(f.dir, 'pwa/.next/cache/external-cache'), 'previous build');
  const result = owner(f, 'build');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(f.dir, 'pwa/.next/cache/external-cache')), false);
});

test('suite failure propagates with its per-suite record', (t) => {
  const f = fixture(t);
  assert.equal(owner(f, 'build').status, 0);
  const result = owner(f, 'run', ['--suites', 'planning recipes'], { CHILD_EXIT: '17' });
  assert.equal(result.status, 17, result.stderr);
  assert.deepEqual(f.calls().filter(c => c.args.includes('test:e2e')).map(c => c.suite), ['planning']);
  const records = fs.readdirSync(path.join(f.dir, '.task/production-browser/runs'))
    .map(id => JSON.parse(fs.readFileSync(path.join(f.dir, '.task/production-browser/runs', id, 'result.json'))));
  const run = records.find(record => record.operation === 'run');
  assert.equal(run.exitCode, 17);
  assert.deepEqual(run.results.map(item => item.exitCode), [17]);
  const runDir = path.join(f.dir, '.task/production-browser/runs', run.id);
  assert.equal(fs.readFileSync(path.join(runDir, 'planning/test-results/trace-fixture.txt'), 'utf8'), 'retained diagnostic');
  assert.equal(fs.readFileSync(path.join(runDir, 'planning/blob-report/report.zip'), 'utf8'), 'blob fixture');
});

for (const alias of ['task', 'npm']) {
  test(`${alias} CI alias owns production settings and clears inherited URL/suite`, (t) => {
    const f = fixture(t);
    const command = alias === 'task' ? realTask : realNpm;
    const args = alias === 'task' ? ['test:e2e:ci'] : ['run', 'test:e2e:ci'];
    const result = spawnSync(command, args, {
      cwd: path.join(f.dir, alias === 'npm' ? 'pwa' : ''),
      env: { ...f.env, BASE_URL: 'http://external.invalid', WFS_E2E_SUITE: 'recipes' },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const calls = f.calls();
    assert.ok(calls.some(c => c.args.includes('build')), 'fresh build required');
    const browser = calls.filter(c => c.args.includes('test:e2e'));
    assert.ok(browser.length > 0, 'browser command must execute');
    for (const call of calls) {
      assert.equal(call.CI, 'true', JSON.stringify(call));
      assert.equal(call.BASE_URL, undefined, 'external runtime must not be reused');
      assert.equal(call.api, 'http://127.0.0.1:5001');
    }
    assert.deepEqual(browser.map(c => c.suite), ['tonight', 'planning', 'recipes', 'household']);
  });
}
