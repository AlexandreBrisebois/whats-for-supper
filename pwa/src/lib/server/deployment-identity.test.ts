import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const repository = path.resolve('..');
const workflow = readFileSync(
  path.join(repository, '.github/workflows/publish-dockerhub.yml'),
  'utf8'
);

describe('install identity deployment configuration', () => {
  it.each([
    ['0.0.0', 'stable'],
    ['12.3.45', 'stable'],
    ['1.2.3-beta.1', 'beta'],
    ['12.3.45-beta.123', 'beta'],
    ['1.2.3-rc.1', null],
    ['01.2.3', null],
    ['1.2.3-beta.0', null],
    ['1.2.3-beta.01', null],
    ['v1.2.3', null],
    ['', null],
    ['1.2.3\n', null],
  ])('derives channel from validated version %j', (version, channel) => {
    const program = workflow.match(
      /name: Derive PWA release channel[\s\S]*?run: \|\n([\s\S]*?)(?=\n  validate:)/
    )?.[1];
    expect(program).toBeDefined();
    const directory = mkdtempSync(path.join(tmpdir(), 'wfs-release-'));
    const output = path.join(directory, 'outputs');
    try {
      const result = spawnSync('bash', ['-c', program!], {
        env: { NODE_ENV: 'test', PATH: process.env.PATH, VERSION: version, GITHUB_OUTPUT: output },
      });
      if (channel) {
        expect(result.status, result.stderr.toString()).toBe(0);
        expect(readFileSync(output, 'utf8')).toBe(`channel=${channel}\n`);
      } else {
        expect(result.status).not.toBe(0);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('passes one validated channel only to the PWA on both published architectures', () => {
    expect(workflow).toContain('channel: ${{ steps.channel.outputs.channel }}');
    expect(workflow).toContain('VERSION: ${{ steps.validate.outputs.version }}');
    expect(workflow).toContain('platforms: linux/amd64,linux/arm64');
    expect(workflow).toContain("matrix.context == './pwa'");
    expect(workflow).toContain('WFS_RELEASE_CHANNEL={0}');
    expect(workflow).toContain('needs.validate-tag.outputs.channel');
  });

  it.each(['docker/compose/apps.yml', 'release-template/synology/compose.yaml'])(
    'passes the identical existing runtime demo input to API and PWA in %s',
    (file) => {
      const content = readFileSync(path.join(repository, file), 'utf8');
      for (const service of ['api', 'pwa']) {
        const block = content.match(
          new RegExp(`^  ${service}:\\n([\\s\\S]*?)(?=^  \\w|^\\w|$(?![\\s\\S]))`, 'm')
        )?.[1];
        expect(block).toBeDefined();
        expect(block).toContain('      DEMO_MODE: ${DEMO_MODE:-false}');
        expect(block).not.toContain('WFS_RELEASE_CHANNEL:');
      }
    }
  );

  it('keeps inspectable immutable channel metadata in the final image', () => {
    const dockerfile = readFileSync('Dockerfile', 'utf8');
    const production = dockerfile.split('FROM base AS production')[1];
    expect(production).toContain(
      'COPY --from=build /app/src/lib/server/release-channel.json ./release-channel.json'
    );
    expect(production).not.toContain('ENV WFS_RELEASE_CHANNEL');
    expect(production).not.toContain('ENV DEMO_MODE');
  });
});
