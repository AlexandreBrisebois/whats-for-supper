export function reportButton({ busy }) {
  return { text: busy ? 'Reporting…' : 'Report issue', disabled: false, minHeight: 44 };
}
