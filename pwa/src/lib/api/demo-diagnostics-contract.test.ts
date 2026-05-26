import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);

function readGenerated(relativePath: string): string {
  return readFileSync(resolve(currentDir, 'generated', relativePath), 'utf8');
}

function readOpenApiSpec(): string {
  return readFileSync(resolve(currentDir, '../../../../specs/openapi.yaml'), 'utf8');
}

describe('demo diagnostics contract', () => {
  it('requires demo diagnostics fields in HealthCheckResponse schema', () => {
    const spec = readOpenApiSpec();
    const match = spec.match(/HealthCheckResponse:\n([\s\S]*?)\n\n    # --- Management ---/m);
    expect(match, 'HealthCheckResponse schema should exist in openapi').not.toBeNull();
    const block = match![1];

    expect(block).toContain(
      'required: [status, timestamp, checks, demoMode, demoModeRawValue, demoRestoreCronValid, allowAgentSearch, allowPhotoSearch]'
    );
    expect(block).toContain('demoModeRawValue:');
    expect(block).toContain('type: string');
    expect(block).toContain('demoRestoreCronValid:');
    expect(block).toContain('type: boolean');
    expect(block).toContain('allowAgentSearch:');
    expect(block).toContain('allowPhotoSearch:');
  });

  it('requires demo diagnostics fields in ManagementTaskStatusResponse schema', () => {
    const spec = readOpenApiSpec();
    const match = spec.match(
      /ManagementTaskStatusResponse:\n([\s\S]*?)\n\n    ManagementTaskAcceptedResponse:/m
    );
    expect(match, 'ManagementTaskStatusResponse schema should exist in openapi').not.toBeNull();
    const block = match![1];

    expect(block).toContain(
      'required: [workflowId, workflowType, status, createdAt, updatedAt, demoSnapshotReady, demoSnapshotMissing, demoRestoreSeederHealthy, demoRestoreSeederErrorCode]'
    );
    expect(block).toContain('demoSnapshotReady:');
    expect(block).toContain('type: boolean');
    expect(block).toContain('demoSnapshotMissing:');
    expect(block).toContain('items: { type: string }');
    expect(block).toContain('demoRestoreSeederHealthy:');
    expect(block).toContain('demoRestoreSeederErrorCode:');
    expect(block).toContain("type: [string, 'null']");
  });

  it('includes typed health diagnostics fields in generated models', () => {
    const modelsSource = readGenerated('models/index.ts');
    const match = modelsSource.match(/export interface HealthCheckResponse[^\n]*\{([\s\S]*?)\n\}/m);
    expect(match, 'HealthCheckResponse should exist in generated models').not.toBeNull();
    const block = match![1];

    expect(block).toContain('demoModeRawValue?: string | null;');
    expect(block).toContain('demoRestoreCronValid?: boolean | null;');
    expect(block).toContain('allowAgentSearch?: boolean | null;');
    expect(block).toContain('allowPhotoSearch?: boolean | null;');
  });

  it('includes typed management diagnostics fields in generated models', () => {
    const modelsSource = readGenerated('models/index.ts');
    const match = modelsSource.match(
      /export interface ManagementTaskStatusResponse[^\n]*\{([\s\S]*?)\n\}/m
    );
    expect(match, 'ManagementTaskStatusResponse should exist in generated models').not.toBeNull();
    const block = match![1];

    expect(block).toContain('demoSnapshotReady?: boolean | null;');
    expect(block).toContain('demoSnapshotMissing?: string[] | null;');
    expect(block).toContain('demoRestoreSeederHealthy?: boolean | null;');
    expect(block).toContain('demoRestoreSeederErrorCode?: string | null;');
  });
});
