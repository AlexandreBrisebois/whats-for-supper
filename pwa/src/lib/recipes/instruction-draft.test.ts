import { describe, expect, it } from 'vitest';
import {
  addInstruction,
  changeInstruction,
  instructionRows,
  originalInstructions,
} from './instruction-draft';
import type { Recipe } from '@/lib/api/recipes';

describe('original instruction editing', () => {
  it('keeps canonical identities and original text without exporting binding proof', () => {
    const original = originalInstructions({
      contentSchemaVersion: 2,
      instructionSections: [
        {
          id: 'section',
          name: 'Sauce',
          steps: [{ id: 'step', text: 'Stir 100 ml.', bindings: [{ status: 'validated' }] }],
        },
      ],
    } as unknown as Recipe);
    expect(changeInstruction(original, true, [0, 0], 'Stir and taste.')).toEqual([
      { id: 'section', name: 'Sauce', steps: [{ id: 'step', text: 'Stir and taste.' }] },
    ]);
    expect(original).toEqual([
      { id: 'section', name: 'Sauce', steps: [{ id: 'step', text: 'Stir 100 ml.' }] },
    ]);
    const added = addInstruction(original, true);
    expect(instructionRows(added, true).map((row) => row.text)).toEqual(['Stir 100 ml.', '']);
    expect(changeInstruction(added, true, [0, 0], null)).toEqual([
      {
        id: 'section',
        name: 'Sauce',
        steps: [expect.objectContaining({ clientId: expect.any(String), text: '' })],
      },
    ]);
  });
  it.each([
    ['strings', ['Boil.', 'Serve.']],
    [
      'flat',
      [{ '@type': 'HowToStep', name: 'Boil', text: 'Boil.', url: '#boil' }, { text: 'Serve.' }],
    ],
    [
      'sections',
      [
        {
          '@type': 'HowToSection',
          name: 'Pasta',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Boil.', url: '#boil' },
            { text: 'Serve.' },
          ],
        },
      ],
    ],
  ])(
    'preserves %s structure and unaffected metadata while editing, adding and removing',
    (_name, input) => {
      const rows = instructionRows(input, false);
      const edited = changeInstruction(input, false, rows[0].path, 'Simmer.');
      expect(instructionRows(edited, false).map((row) => row.text)).toEqual(['Simmer.', 'Serve.']);
      const added = addInstruction(edited, false);
      expect(instructionRows(added, false).map((row) => row.text)).toEqual([
        'Simmer.',
        'Serve.',
        '',
      ]);
      expect(
        instructionRows(
          changeInstruction(added, false, instructionRows(added, false)[1].path, null),
          false
        ).map((row) => row.text)
      ).toEqual(['Simmer.', '']);
      expect(JSON.stringify(edited).includes('#boil')).toBe(_name !== 'strings');
    }
  );
  it('allows filling initially missing instructions', () => {
    const added = addInstruction([], false);
    expect(
      instructionRows(changeInstruction(added, false, [0], 'Taste and serve.'), false)[0].text
    ).toBe('Taste and serve.');
  });
});
