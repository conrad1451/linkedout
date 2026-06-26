/**
 * Parse the "Questions & Answers" field from LinkedIn's `Jobs/Job Applications.csv`.
 *
 * LinkedIn stores all application questions in a single column using a
 * proprietary format: pairs are separated by ` | `, and within each pair
 * the first `:` separates the question (key) from the answer (value).
 * Answers may contain additional `:` characters (e.g. dates, times).
 */

export interface QAPair {
  question: string;
  answer: string;
}

const PAIR_SEPARATOR = ' | ';
const QA_SEPARATOR = ':';

/**
 * Split a raw LinkedIn Q&A string into structured question/answer pairs.
 * Returns an empty array for empty or blank input.
 */
export function parseQAPairs(raw: string): QAPair[] {
  if (!raw || raw.trim().length === 0) return [];

  return raw.split(PAIR_SEPARATOR).map(parseSinglePair).filter(notEmpty);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseSinglePair(pair: string): QAPair | null {
  const trimmed = pair.trim();
  if (trimmed.length === 0) return null;

  const separatorIdx = trimmed.indexOf(QA_SEPARATOR);
  if (separatorIdx === -1) {
    // No colon — treat the entire string as the answer with no question
    return { question: '', answer: trimmed };
  }

  const question = trimmed.slice(0, separatorIdx).trim();
  const answer = trimmed.slice(separatorIdx + 1).trim();

  return { question, answer };
}

function notEmpty(pair: QAPair | null): pair is QAPair {
  return pair !== null && (pair.question.length > 0 || pair.answer.length > 0);
}
