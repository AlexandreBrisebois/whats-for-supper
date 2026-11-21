const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function monday(timestamp, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(timestamp)).map(part => [part.type, part.value]));
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
function requirePair(dates) {
  assert.ok(Array.isArray(dates) && dates.length === 2 && dates[0] < dates[1], 'Exactly two ordered reviewed weeks required');
  for (const date of dates) {
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
    const parsed = new Date(date + 'T00:00:00Z');
    assert.equal(parsed.toISOString().slice(0, 10), date);
    assert.equal(parsed.getUTCDay(), 1, 'Fixture week must be Monday');
  }
  return dates;
}
function validate(receipt, expected, now = Date.now()) {
  const dates = requirePair(expected.dates);
  assert.equal(receipt.version, 1); assert.equal(receipt.status, 'passed');
  assert.equal(receipt.reviewer, 'C'); assert.equal(receipt.independent, true); assert.equal(receipt.readOnly, true);
  for (const key of ['operationId', 'candidate', 'marker', 'backupReceiptPath', 'backupReceiptSha256', 'originalPostgresContainerId', 'baselineReadbackContainerId'])
    assert.equal(receipt[key], expected[key], 'Date admission ' + key + ' differs');
  assert.match(receipt.operationId, /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
  assert.match(receipt.candidate, /^[a-f0-9]{40}$/); assert.match(receipt.marker, /^dvpackage-[a-f0-9]{8}$/);
  assert.match(receipt.backupReceiptSha256, /^[a-f0-9]{64}$/); assert.equal(path.isAbsolute(receipt.backupReceiptPath), true);
  for (const key of ['originalPostgresContainerId', 'baselineReadbackContainerId']) assert.match(receipt[key], /^[a-f0-9]{64}$/);
  assert.notEqual(receipt.originalPostgresContainerId, receipt.baselineReadbackContainerId);
  assert.equal(expected.referenceWeekStartDate, dates[0]); assert.equal(receipt.referenceWeekStartDate, dates[0]);
  assert.deepEqual(receipt.dates, dates);
  assert.match(receipt.checkedAtUtc, /(?:Z|\+00:00)$/); assert.match(receipt.expiresAtUtc, /(?:Z|\+00:00)$/);
  const checked = Date.parse(receipt.checkedAtUtc), expires = Date.parse(receipt.expiresAtUtc);
  assert.ok(Number.isFinite(checked) && Number.isFinite(expires) && Number.isFinite(now));
  assert.ok(checked <= now && now < expires && expires > checked && expires - checked <= 90000, 'Date proof is stale or future-dated');
  assert.equal(receipt.calendarTimeZone, 'UTC');
  assert.equal(receipt.currentWeekStartDate, monday(checked, 'UTC')); assert.equal(receipt.currentWeekStartDate, monday(now, 'UTC'));
  assert.ok(Date.parse(dates[0] + 'T00:00:00Z') - Date.parse(receipt.currentWeekStartDate + 'T00:00:00Z') >= 14 * 86400000);
  assert.equal(receipt.currentWeekRolloverEligibleCount, 0);
  for (const phase of ['baseline', 'private']) {
    assert.deepEqual(Object.keys(receipt[phase]).sort(), ['supperServingsAbsent', 'weeklyPlansAbsent']);
    assert.deepEqual(receipt[phase].weeklyPlansAbsent, dates); assert.deepEqual(receipt[phase].supperServingsAbsent, dates);
  }
  return structuredClone(receipt);
}
function load(options, now = Date.now()) {
  requirePair(options.dates);
  assert.ok(options.receiptPath && /^[a-f0-9]{64}$/.test(options.receiptSha256 ?? ''));
  const raw = fs.readFileSync(options.receiptPath); assert.equal(sha(raw), options.receiptSha256);
  const { deployment, preflight } = options;
  for (const value of [deployment, preflight]) {
    assert.equal(value.operationId, options.operationId); assert.equal(value.candidate, options.candidate);
  }
  const backupReceiptPath = fs.realpathSync(deployment.backupReceipt);
  const bytes = fs.readFileSync(backupReceiptPath), backup = JSON.parse(bytes);
  assert.equal(backup.verified, true); assert.equal(backup.operationId, options.operationId); assert.equal(backup.candidate, options.candidate);
  const receipt = validate(JSON.parse(raw), { ...options, backupReceiptPath, backupReceiptSha256: sha(bytes),
    baselineReadbackContainerId: backup.retainedReadbackResources?.containerId,
    originalPostgresContainerId: preflight.originalContainers['whats-for-supper-postgres'].id }, now);
  return { ...receipt, receiptPath: fs.realpathSync(options.receiptPath), receiptSha256: options.receiptSha256, verifiedAtUtc: new Date(now).toISOString() };
}
function planAllowed(state) {
  try {
    const proof = state.dateAdmission;
    requirePair(proof.dates);
    return proof.version === 1 && proof.status === 'passed' && proof.reviewer === 'C' && proof.independent === true && proof.readOnly === true
      && proof.operationId === state.operationId && proof.candidate === state.candidate && proof.marker === state.marker
      && /^[a-f0-9]{40}$/.test(state.candidate ?? '') && /^dvpackage-[a-f0-9]{8}$/.test(state.marker ?? '')
      && proof.referenceWeekStartDate === proof.dates[0] && /^[a-f0-9]{64}$/.test(proof.receiptSha256 ?? '');
  } catch { return false; }
}
function selectedAllowed(state, selected) {
  return Boolean(planAllowed(state) && selected && state.dateAdmission.dates.includes(selected.weekStartDate)
    && selected.date === selected.weekStartDate && selected.index === 0 && selected.priorOverride === null);
}
function requireUnchanged(state) {
  assert.equal(planAllowed(state), true);
  const proof = state.dateAdmission, raw = fs.readFileSync(proof.receiptPath);
  assert.equal(sha(raw), proof.receiptSha256);
  const recorded = Object.fromEntries(Object.entries(proof).filter(([key]) => !['receiptPath', 'receiptSha256', 'verifiedAtUtc'].includes(key)));
  assert.deepEqual(JSON.parse(raw), recorded);
  assert.equal(sha(fs.readFileSync(proof.backupReceiptPath)), proof.backupReceiptSha256, 'Verified backup receipt changed');
}
module.exports = { monday, requirePair, validate, load, planAllowed, selectedAllowed, requireUnchanged };
