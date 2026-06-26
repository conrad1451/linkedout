/**
 * LinkedIn CSV export wraps every line of a ShareCommentary field in
 * double-quote characters and uses a `""` line as a paragraph separator.
 * After standard CSV parsing, a multi-paragraph post looks like:
 *
 *   "First line."\n""\n"Second line."\n"Still second paragraph."\n""\n"Third."
 *
 * This function strips the LinkedIn-added wrapping quotes from every line
 * so the output matches the original post text.
 *
 * Single-paragraph posts (even those with genuine double-quotes) are not
 * affected because the separator `\n""\n` is required before any stripping
 * is attempted.
 *
 * When a line genuinely starts or ends with `"`, the raw CSV encodes that
 * as `""""` (4 quotes), which becomes `""` after parsing. Stripping one
 * `"` from each end correctly leaves the genuine `"` in place.
 */
export function cleanShareCommentary(text: string): string {
  const separator = '\n""\n';
  if (!text.includes(separator)) return text;

  const paragraphs = text.split(separator);

  const cleaned = paragraphs.map((para) => {
    return para
      .split('\n')
      .map((line) => {
        let l = line;
        if (l.startsWith('"')) l = l.slice(1);
        if (l.endsWith('"')) l = l.slice(0, -1);
        return l;
      })
      .join('\n');
  });

  return cleaned.filter(Boolean).join('\n\n');
}
