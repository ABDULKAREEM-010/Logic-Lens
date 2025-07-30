/**
 * Apply replacements to the code based on line and new content.
 * Supports multiple line changes (overwrites full line).
 *
 * @param {string} code - Original code string.
 * @param {Array} replacements - Array of replacement objects:
 *   { line: number (1-based), newText: string }
 * @returns {string} - Updated code with replacements applied.
 */
export function applyReplacements(code, replacements) {
  const lines = code.split('\n');
  const lineMap = new Map();

  // Prepare a map for quick line replacement (handles multiple changes to same line)
  for (const { line, newText } of replacements) {
    const lineIndex = line - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      lineMap.set(lineIndex, newText);
    }
  }

  // Replace lines
  const updatedLines = lines.map((line, idx) =>
    lineMap.has(idx) ? lineMap.get(idx) : line
  );

  return updatedLines.join('\n');
}
