/**
 * Turns any value into a CSV cell that a spreadsheet cannot read as a formula.
 * Values starting with =, +, -, @, tab or carriage return are prefixed with a
 * single quote so Excel/Sheets treat them as plain text.
 */
export function csvSafeCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
