import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);

function readGenerated(relativePath: string): string {
  return readFileSync(resolve(currentDir, 'generated', relativePath), 'utf8');
}

// Snapshot 1: CaptureFailureListResponse schema exists in generated client
describe('generated failed-captures contract', () => {
  it('includes CaptureFailureListResponse schema in generated models', () => {
    const modelsSource = readGenerated('models/index.ts');
    expect(modelsSource).toContain('export interface CaptureFailureListResponse');
  });

  // Snapshot 2: CaptureFailureDto has required fields
  it('includes CaptureFailureDto with workflow-backed fields', () => {
    const modelsSource = readGenerated('models/index.ts');
    const match = modelsSource.match(/export interface CaptureFailureDto[^\n]*\{([\s\S]*?)\n\}/m);
    expect(match, 'CaptureFailureDto should exist in generated models').not.toBeNull();
    const block = match![1];
    expect(block).toContain('id');
    expect(block).toContain('workflowInstanceId');
    expect(block).toContain('recipeId');
    expect(block).toContain('sourceWorkflowId');
    expect(block).toContain('sourceType');
    expect(block).toContain('previewText');
    expect(block).toContain('friendlyReason');
    expect(block).toContain('failedStep');
    expect(block).toContain('status');
    expect(block).toContain('retryCount');
    expect(block).toContain('isReady');
    expect(block).toContain('createdAt');
    expect(block).toContain('lastFailedAt');
  });

  it('includes CaptureFailureDetailsDto, CaptureActivityItemDto, and CaptureActivityListResponse', () => {
    const modelsSource = readGenerated('models/index.ts');
    const detailsMatch = modelsSource.match(
      /export interface CaptureFailureDetailsDto[^\n]*\{([\s\S]*?)\n\}/m
    );
    expect(detailsMatch).not.toBeNull();
    expect(detailsMatch![1]).toContain('workflowInstanceId');
    expect(detailsMatch![1]).toContain('failedStep');
    expect(detailsMatch![1]).toContain('errorMessage');
    expect(detailsMatch![1]).toContain('stackTrace');

    expect(modelsSource).toContain('export interface CaptureActivityListResponse');
    const activityMatch = modelsSource.match(
      /export interface CaptureActivityItemDto[^\n]*\{([\s\S]*?)\n\}/m
    );
    expect(activityMatch).not.toBeNull();
    expect(activityMatch![1]).toContain('stage');
    expect(activityMatch![1]).toContain('isReady');
    expect(activityMatch![1]).toContain('isSuspectedDuplicate');
  });

  it('includes /api/captures/activity and /api/captures/failures/{id}/details GET builders', () => {
    const activityPath = resolve(currentDir, 'generated', 'api/captures/activity/index.ts');
    const detailsPath = resolve(
      currentDir,
      'generated',
      'api/captures/failures/item/details/index.ts'
    );
    expect(existsSync(activityPath)).toBe(true);
    expect(existsSync(detailsPath)).toBe(true);
  });

  // Snapshot 3: CaptureFailureRetryResponse schema exists with queued field
  it('includes CaptureFailureRetryResponse schema with queued boolean', () => {
    const modelsSource = readGenerated('models/index.ts');
    const match = modelsSource.match(
      /export interface CaptureFailureRetryResponse[^\n]*\{([\s\S]*?)\n\}/m
    );
    expect(match, 'CaptureFailureRetryResponse should exist in generated models').not.toBeNull();
    const block = match![1];
    expect(block).toContain('queued');
  });

  // Snapshot 4: GET /api/captures/failures request builder exists
  it('includes /api/captures/failures GET builder in the generated client', () => {
    const routePath = resolve(currentDir, 'generated', 'api/captures/failures/index.ts');
    expect(existsSync(routePath)).toBe(true);
  });

  // Snapshot 5: POST /api/captures/failures/{id}/retry builder exists
  it('includes /api/captures/failures/{id}/retry POST builder in the generated client', () => {
    const retryPath = resolve(currentDir, 'generated', 'api/captures/failures/item/retry/index.ts');
    expect(existsSync(retryPath)).toBe(true);
  });

  it('includes /api/captures/failures/{id} DELETE builder in the generated client', () => {
    const itemPath = readGenerated('api/captures/failures/item/index.ts');
    expect(itemPath).toContain('delete(');
  });
});
