import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import enCommon from './en/common.json';
import enHints from './en/hints.json';
import enJourneys from './en/journeys.json';
import frCommon from './fr/common.json';
import frHints from './fr/hints.json';
import frJourneys from './fr/journeys.json';

type TranslationTable = Record<string, unknown>;

function flatten(obj: TranslationTable, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).flatMap(([key, value]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.entries(flatten(value as TranslationTable, nextPrefix));
      }
      return [[nextPrefix, String(value)]];
    })
  );
}

function mergeTranslations(...tables: TranslationTable[]): TranslationTable {
  return tables.reduce<TranslationTable>((merged, table) => {
    for (const [key, value] of Object.entries(table)) {
      const existing = merged[key];
      if (
        existing &&
        value &&
        typeof existing === 'object' &&
        typeof value === 'object' &&
        !Array.isArray(existing) &&
        !Array.isArray(value)
      ) {
        merged[key] = mergeTranslations(existing as TranslationTable, value as TranslationTable);
      } else {
        merged[key] = value;
      }
    }
    return merged;
  }, {});
}

function walkFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    if (!/\.(tsx?|jsx?)$/.test(entry.name) || /\.test\./.test(entry.name)) return [];
    return [fullPath];
  });
}

function usedTranslationKeys(): string[] {
  const srcRoot = path.resolve(__dirname, '..');
  const files = [
    ...walkFiles(path.join(srcRoot, 'app')),
    ...walkFiles(path.join(srcRoot, 'components')),
  ];
  const keys = new Set<string>();
  const callPattern = /\bt(?:WithVars)?\(\s*['"]([^'"]+)['"]/g;

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8');
    for (const match of contents.matchAll(callPattern)) {
      keys.add(match[1]);
    }
  }

  return [...keys].sort();
}

describe('locale integrity', () => {
  const en = flatten(mergeTranslations(enCommon, enHints, enJourneys));
  const fr = flatten(mergeTranslations(frCommon, frHints, frJourneys));

  it('keeps English and French catalogs in structural parity', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  });

  it('has catalog entries for every UI translation key', () => {
    const usedKeys = usedTranslationKeys();
    expect(usedKeys.filter((key) => !(key in en))).toEqual([]);
    expect(usedKeys.filter((key) => !(key in fr))).toEqual([]);
  });
});
