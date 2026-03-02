/** Hebrew month names → numeric index (1-based) */
const HEBREW_MONTHS: Record<string, number> = {
  ינואר: 1,
  פברואר: 2,
  מרץ: 3,
  מרס: 3,
  אפריל: 4,
  מאי: 5,
  יוני: 6,
  יולי: 7,
  אוגוסט: 8,
  ספטמבר: 9,
  אוקטובר: 10,
  נובמבר: 11,
  דצמבר: 12,
};

/** Numeric month → Hebrew name */
const MONTH_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(HEBREW_MONTHS).map(([name, num]) => [num, name])
);

/**
 * Parse a month string that might be Hebrew name or numeric.
 * Returns { month: "ינואר", year: "2024" } or null.
 */
export function parseMonthYear(text: string): {
  month: string;
  year: string;
} | null {
  // Try "ינואר 2024" or "ינואר 24"
  for (const [name] of Object.entries(HEBREW_MONTHS)) {
    const regex = new RegExp(`${name}\\s+(\\d{2,4})`);
    const match = text.match(regex);
    if (match) {
      const year = normalizeYear(match[1]);
      return { month: name, year };
    }
  }

  // Try numeric: "01/2024", "1/2024", "01-2024", "01.2024"
  const numericMatch = text.match(/(\d{1,2})[/\-.](\d{2,4})/);
  if (numericMatch) {
    const monthNum = parseInt(numericMatch[1], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      const year = normalizeYear(numericMatch[2]);
      const monthName = MONTH_NAMES[monthNum] || String(monthNum);
      return { month: monthName, year };
    }
  }

  return null;
}

function normalizeYear(y: string): string {
  if (y.length === 2) {
    const num = parseInt(y, 10);
    return num > 50 ? `19${y}` : `20${y}`;
  }
  return y;
}

/**
 * Build a display label from month + year.
 */
export function monthLabel(month: string, year: string): string {
  return `${month} ${year}`;
}

/**
 * Build a safe filename from name + month + year.
 * Hebrew characters are fine in filenames — just strip problematic chars.
 */
export function buildFilename(
  name: string,
  month: string,
  year: string
): string {
  const clean = (s: string) => s.replace(/[/\\:*?"<>|]/g, "").trim();
  return `${clean(name)}_${clean(month)}_${clean(year)}.pdf`;
}

/**
 * Build ZIP filename with current date.
 */
export function buildZipFilename(): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `תלושי_שכר_${date}.zip`;
}

/**
 * Normalize Hebrew text: remove extra whitespace, niqqud, etc.
 */
export function normalizeHebrew(text: string): string {
  return (
    text
      // Remove Hebrew niqqud (diacritics)
      .replace(/[\u0591-\u05C7]/g, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Clean an extracted name: remove ID numbers, extra punctuation.
 */
export function cleanName(raw: string): string {
  return (
    raw
      // Remove sequences of digits (ID numbers)
      .replace(/\d{5,}/g, "")
      // Remove common prefixes/suffixes
      .replace(/ת\.?ז\.?:?/g, "")
      // Remove punctuation except hyphens
      .replace(/[.,;:!?()[\]{}'"]/g, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}
