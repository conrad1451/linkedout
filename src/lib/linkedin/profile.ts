export interface LinkedInProfileInfo {
  username: string;
  url: string;
}

export type LinkedInProfileSection =
  | 'experience'
  | 'education'
  | 'courses'
  | 'honors'
  | 'languages'
  | 'recommendations'
  | 'skills';

export interface LinkedInProfileSourceDataset {
  schemaId: string;
  rows: Array<Record<string, string>>;
}

const LINKEDIN_PROFILE_URL_RE = /(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/in\/[^/?#\s,;)'"]+/i;

export function inferLinkedInProfileInfo(
  datasets: LinkedInProfileSourceDataset[],
): LinkedInProfileInfo | undefined {
  const profileName = profileNameFromDatasets(datasets);
  const candidates = new Map<string, number>();

  for (const dataset of datasets) {
    if (dataset.schemaId === 'profile') {
      for (const row of dataset.rows) addProfileFieldCandidates(candidates, row, 100);
    }

    if (dataset.schemaId === 'invitations') {
      for (const row of dataset.rows) addInvitationCandidates(candidates, row, profileName);
    }

    if (isMessageDataset(dataset.schemaId) && profileName) {
      for (const row of dataset.rows) addMessageCandidates(candidates, row, profileName);
    }
  }

  let bestUrl: string | undefined;
  let bestScore = 0;
  for (const [url, score] of candidates) {
    if (score > bestScore) {
      bestUrl = url;
      bestScore = score;
    }
  }

  return bestUrl ? linkedInProfileInfoFromUrl(bestUrl) : undefined;
}

export function linkedInProfileInfoFromUrl(value: string): LinkedInProfileInfo | undefined {
  const url = normalizeLinkedInProfileUrl(value);
  const username = url ? linkedInProfileUsernameFromUrl(url) : undefined;
  return url && username ? { username, url } : undefined;
}

export function linkedInProfileSectionUrl(
  profile: LinkedInProfileInfo | undefined,
  section: LinkedInProfileSection,
): string | undefined {
  if (!profile?.username) return undefined;
  return `https://www.linkedin.com/in/${encodeURIComponent(profile.username)}/details/${section}/`;
}

export function linkedInProfileIntroEditUrl(
  profile: LinkedInProfileInfo | undefined,
): string | undefined {
  if (!profile?.username) return undefined;
  return `https://www.linkedin.com/in/${encodeURIComponent(profile.username)}/edit/intro`;
}

export function linkedInProfileSummaryEditUrl(
  profile: LinkedInProfileInfo | undefined,
): string | undefined {
  if (!profile?.username) return undefined;
  return `https://www.linkedin.com/in/${encodeURIComponent(profile.username)}/edit/forms/summary/new/`;
}

function addProfileFieldCandidates(
  candidates: Map<string, number>,
  row: Record<string, string>,
  score: number,
): void {
  for (const [key, value] of Object.entries(row)) {
    if (!/(profile|public|url)/i.test(key)) continue;
    addCandidate(candidates, value, score);
  }
}

function addInvitationCandidates(
  candidates: Map<string, number>,
  row: Record<string, string>,
  profileName: string | undefined,
): void {
  const direction = field(row, 'Direction').toUpperCase();
  const from = normalizePersonName(field(row, 'From'));
  const to = normalizePersonName(field(row, 'To'));

  if (direction === 'OUTGOING') addCandidate(candidates, field(row, 'inviterProfileUrl'), 10);
  if (direction === 'INCOMING') addCandidate(candidates, field(row, 'inviteeProfileUrl'), 10);
  if (!profileName) return;

  if (from === profileName) addCandidate(candidates, field(row, 'inviterProfileUrl'), 5);
  if (to === profileName) addCandidate(candidates, field(row, 'inviteeProfileUrl'), 5);
}

function addMessageCandidates(
  candidates: Map<string, number>,
  row: Record<string, string>,
  profileName: string,
): void {
  if (normalizePersonName(field(row, 'FROM')) === profileName) {
    addCandidate(candidates, field(row, 'SENDER PROFILE URL'), 3);
  }

  const recipients = splitLinkedInList(field(row, 'TO'));
  const recipientUrls = splitLinkedInList(field(row, 'RECIPIENT PROFILE URLS'));
  const index = recipients.findIndex((recipient) => normalizePersonName(recipient) === profileName);
  if (index >= 0)
    addCandidate(candidates, recipientUrls[index] ?? field(row, 'RECIPIENT PROFILE URLS'), 3);
}

function addCandidate(candidates: Map<string, number>, value: string, score: number): void {
  const url = normalizeLinkedInProfileUrl(value);
  if (!url) return;
  candidates.set(url, (candidates.get(url) ?? 0) + score);
}

function normalizeLinkedInProfileUrl(value: string): string | undefined {
  const match = value.match(LINKEDIN_PROFILE_URL_RE);
  if (!match) return undefined;

  const raw = /^https?:\/\//i.test(match[0]) ? match[0] : `https://${match[0]}`;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return undefined;
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return undefined;

  const username = linkedInProfileUsernameFromUrl(parsed.toString());
  if (!username) return undefined;
  return `https://www.linkedin.com/in/${encodeURIComponent(username)}`;
}

function linkedInProfileUsernameFromUrl(value: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return undefined;
  }

  const [, root, username] = parsed.pathname.split('/');
  if (root?.toLowerCase() !== 'in' || !username) return undefined;

  try {
    return decodeURIComponent(username);
  } catch {
    return username;
  }
}

function profileNameFromDatasets(datasets: LinkedInProfileSourceDataset[]): string | undefined {
  const profile = datasets.find((dataset) => dataset.schemaId === 'profile')?.rows[0];
  const name = [field(profile, 'First Name'), field(profile, 'Last Name')]
    .filter(Boolean)
    .join(' ');
  return normalizePersonName(name) || undefined;
}

function isMessageDataset(schemaId: string): boolean {
  return (
    schemaId === 'messages' ||
    schemaId === 'guide-messages' ||
    schemaId === 'learning-coach-messages' ||
    schemaId === 'learning-role-play-messages'
  );
}

function splitLinkedInList(value: string): string[] {
  return value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function field(row: Record<string, string> | undefined, key: string): string {
  return row?.[key]?.trim() ?? '';
}
