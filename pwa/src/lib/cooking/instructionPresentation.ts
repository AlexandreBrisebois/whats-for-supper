/** Separate reading beats without rewriting or dropping any source text. */
export function formatCookingInstruction(instruction: string): string[] {
  if (typeof Intl.Segmenter !== 'function') return [instruction];
  return Array.from(
    new Intl.Segmenter(undefined, { granularity: 'sentence' }).segment(instruction),
    (item) => item.segment
  );
}
