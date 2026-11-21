import { describe, expect, it } from 'vitest';
import {
  addInstruction,
  addInstructionSection,
  canonicalInstructionInput,
  changeInstruction,
  changeInstructionSectionName,
  instructionRows,
  instructionSections,
  legacyInstructionInput,
  originalInstructions,
  removeInstructionSection,
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

  it('projects section-grouped canonical drafts and preserves identities across section/step edits', () => {
    const original = originalInstructions({
      contentSchemaVersion: 2,
      instructionSections: [
        {
          id: 'sec-1',
          name: 'Sauce',
          steps: [
            { id: 'step-1', text: 'Simmer.' },
            { id: 'step-2', text: 'Season.' },
          ],
        },
        {
          id: 'sec-2',
          name: null,
          steps: [{ id: 'step-3', text: 'Plate.' }],
        },
      ],
    } as unknown as Recipe);

    expect(instructionSections(original, true)).toEqual([
      {
        sectionIndex: 0,
        key: 'sec-1',
        name: 'Sauce',
        steps: [
          { path: [0, 0], stepNumber: 1, text: 'Simmer.' },
          { path: [0, 1], stepNumber: 2, text: 'Season.' },
        ],
      },
      {
        sectionIndex: 1,
        key: 'sec-2',
        name: '',
        steps: [{ path: [1, 0], stepNumber: 3, text: 'Plate.' }],
      },
    ]);

    const renamed = changeInstructionSectionName(original, true, 1, '  Plating  ');
    expect(instructionSections(renamed, true)[1].name).toBe('  Plating  ');
    expect(canonicalInstructionInput(renamed)).toEqual([
      {
        id: 'sec-1',
        name: 'Sauce',
        steps: [
          { id: 'step-1', text: 'Simmer.' },
          { id: 'step-2', text: 'Season.' },
        ],
      },
      {
        id: 'sec-2',
        name: 'Plating',
        steps: [{ id: 'step-3', text: 'Plate.' }],
      },
    ]);

    const cleared = changeInstructionSectionName(renamed, true, 0, '   ');
    expect(canonicalInstructionInput(cleared)?.[0]).toMatchObject({
      id: 'sec-1',
      name: null,
      steps: [
        { id: 'step-1', text: 'Simmer.' },
        { id: 'step-2', text: 'Season.' },
      ],
    });

    const addedToFirst = addInstruction(original, true, 0);
    expect(instructionSections(addedToFirst, true)).toMatchObject([
      {
        sectionIndex: 0,
        steps: [
          { path: [0, 0], stepNumber: 1, text: 'Simmer.' },
          { path: [0, 1], stepNumber: 2, text: 'Season.' },
          { path: [0, 2], stepNumber: 3, text: '' },
        ],
      },
      {
        sectionIndex: 1,
        steps: [{ path: [1, 0], stepNumber: 4, text: 'Plate.' }],
      },
    ]);

    const withNewSection = addInstructionSection(original, true);
    expect(instructionSections(withNewSection, true)).toHaveLength(3);
    expect(withNewSection[2]).toEqual({
      clientId: expect.any(String),
      name: null,
      steps: [{ clientId: expect.any(String), text: '' }],
    });

    const removedSection = removeInstructionSection(withNewSection, true, 0);
    expect(instructionSections(removedSection, true)).toMatchObject([
      { sectionIndex: 0, key: 'sec-2', steps: [{ path: [0, 0], stepNumber: 1, text: 'Plate.' }] },
      { sectionIndex: 1, steps: [{ path: [1, 0], stepNumber: 2, text: '' }] },
    ]);
  });

  it('projects and edits legacy string, flat HowToStep, and HowToSection arrays with headers', () => {
    const flat = [
      { '@type': 'HowToStep', name: 'Boil', text: 'Boil.', url: '#boil' },
      { text: 'Serve.' },
    ];
    expect(instructionSections(flat, false)).toEqual([
      {
        sectionIndex: 0,
        key: 'section-0',
        name: '',
        steps: [
          { path: [0], stepNumber: 1, text: 'Boil.' },
          { path: [1], stepNumber: 2, text: 'Serve.' },
        ],
      },
    ]);

    const upgraded = changeInstructionSectionName(flat, false, 0, '  Prep  ');
    expect(instructionSections(upgraded, false)).toEqual([
      {
        sectionIndex: 0,
        key: 'section-0',
        name: '  Prep  ',
        steps: [
          { path: [0, 0], stepNumber: 1, text: 'Boil.' },
          { path: [0, 1], stepNumber: 2, text: 'Serve.' },
        ],
      },
    ]);
    expect(JSON.stringify(upgraded)).toContain('#boil');
    expect(legacyInstructionInput(upgraded)).toEqual([
      {
        '@type': 'HowToSection',
        name: 'Prep',
        itemListElement: flat,
      },
    ]);

    const withSecondSection = addInstructionSection(['Boil.'], false);
    expect(instructionSections(withSecondSection, false)).toMatchObject([
      { sectionIndex: 0, name: '', steps: [{ path: [0, 0], stepNumber: 1, text: 'Boil.' }] },
      { sectionIndex: 1, name: '', steps: [{ path: [1, 0], stepNumber: 2, text: '' }] },
    ]);

    const addedToFirstLegacy = addInstruction(withSecondSection, false, 0);
    expect(instructionSections(addedToFirstLegacy, false)[0].steps).toHaveLength(2);
    expect(removeInstructionSection(['Boil.'], false, 0)).toEqual([]);
    expect(removeInstructionSection(withSecondSection, false, 0)).toHaveLength(1);
    expect(legacyInstructionInput(changeInstructionSectionName(upgraded, false, 0, '   '))).toEqual(
      [
        {
          '@type': 'HowToSection',
          name: null,
          itemListElement: flat,
        },
      ]
    );
  });
});
