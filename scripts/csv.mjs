// Minimal RFC 4180-ish CSV parser/writer used by the anonymizer.
// Preserves multi-line cells, embedded quotes (escaped as ""),
// and round-trips header rows.

export function parseCsv(text) {
  // Strip BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\r') {
      // swallow; handled with \n
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // Flush trailing field/row (only if there is any content).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function needsQuoting(s) {
  return /[",\r\n]/.test(s);
}

export function writeCsv(rows, { eol = '\n' } = {}) {
  const lines = [];
  for (const row of rows) {
    const cells = row.map((v) => {
      const s = v == null ? '' : String(v);
      if (needsQuoting(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    });
    lines.push(cells.join(','));
  }
  return lines.join(eol) + eol;
}
