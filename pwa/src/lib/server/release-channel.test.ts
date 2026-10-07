import { readFileSync } from 'node:fs';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import artifact from './release-channel.json';

describe('image channel scaffold', () => {
  it('defaults local source to stable', () => {
    expect(artifact.channel).toBe('stable');
  });
  it.each(['stable', 'beta', 'invalid', ''])(
    'executes image artifact generation for %s',
    (channel) => {
      const dockerfile = readFileSync('Dockerfile', 'utf8');
      const program = dockerfile.match(/node -e '([^']+)'/)?.[1];
      expect(program).toBeDefined();
      const root = mkdtempSync(path.join(tmpdir(), 'wfs-channel-'));
      try {
        mkdirSync(path.join(root, 'src/lib/server'), { recursive: true });
        const result = spawnSync(process.execPath, ['-e', program!], {
          cwd: root,
          env: { NODE_ENV: 'test', WFS_RELEASE_CHANNEL: channel },
        });
        if (channel === 'stable' || channel === 'beta') {
          expect(result.status).toBe(0);
          expect(
            JSON.parse(readFileSync(path.join(root, 'src/lib/server/release-channel.json'), 'utf8'))
          ).toEqual({ channel });
        } else {
          expect(result.status).not.toBe(0);
          expect(result.stderr.toString()).toContain('Invalid WFS_RELEASE_CHANNEL');
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  );
  it('validates and writes the channel artifact before the Next build', () => {
    const dockerfile = readFileSync('Dockerfile', 'utf8');
    expect(dockerfile).toContain('ARG WFS_RELEASE_CHANNEL=stable');
    expect(dockerfile).toContain('["stable", "beta"].includes(channel)');
    expect(dockerfile).toContain('src/lib/server/release-channel.json');
    expect(dockerfile.indexOf('src/lib/server/release-channel.json')).toBeLessThan(
      dockerfile.indexOf('npm run build')
    );
    expect(dockerfile).not.toContain('ENV WFS_RELEASE_CHANNEL');
  });
});
