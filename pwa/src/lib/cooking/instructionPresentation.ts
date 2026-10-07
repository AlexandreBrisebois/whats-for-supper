/** Keep sentences flowing; only explicit blank lines start another paragraph.
 * Retain separators in the strings so presentation never drops source text.
 */
export function formatCookingInstruction(instruction: string): string[] {
  const paragraphs: string[] = [];
  let start = 0;
  for (const match of instruction.matchAll(/\r?\n[\t ]*\r?\n(?:[\t ]*\r?\n)*/g)) {
    const end = match.index + match[0].length;
    paragraphs.push(instruction.slice(start, end));
    start = end;
  }
  if (start < instruction.length || paragraphs.length === 0) {
    paragraphs.push(instruction.slice(start));
  }
  return paragraphs;
}
