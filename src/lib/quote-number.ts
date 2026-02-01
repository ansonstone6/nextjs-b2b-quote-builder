export function formatQuoteNumber(prefix: string, seq: number): string {
  const y = new Date().getFullYear();
  const n = String(seq).padStart(5, "0");
  return `${prefix}-${y}-${n}`;
}
