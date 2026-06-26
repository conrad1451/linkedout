#!/usr/bin/env node
// Anonymize a real LinkedIn data export into safe test fixtures.
//
// Reads:  ./Complete_LinkedInDataExport_12-17-2025/
// Writes: ./test-data/
// Reads/writes mapping: ./scripts/anonymize-mapping.json
// Reads owner aliases:   ./scripts/anonymize-owner.local.json
//
// Run: node scripts/anonymize.mjs

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCsv, writeCsv } from './csv.mjs';
import * as pools from './fake-pools.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const SRC = path.join(REPO, 'Complete_LinkedInDataExport_12-17-2025');
const DST = path.join(REPO, 'test-data');
const MAPPING_FILE = path.join(HERE, 'anonymize-mapping.json');
const OWNER_ALIASES_FILE = path.join(HERE, 'anonymize-owner.local.json');
const ROW_CAP = 100;
const OWNER_ALIAS_WARNING =
  'Owner alias matching disabled. Create scripts/anonymize-owner.local.json locally to keep the export owner mapped to the stable fake persona without committing personal identifiers.';

// ------------------------------------------------------------------
// Owner persona (the LinkedIn account holder in the source export).
// Real-world owner aliases are loaded from a local gitignored file so
// public source control never contains personal identifiers.
// ------------------------------------------------------------------
const OWNER = {
  firstName: 'Joe',
  lastName: 'Smith',
  fullName: 'Joe Smith',
  slug: 'joe-smith',
  emails: ['joe.smith@example.com', 'joe@example.com', 'j.smith@example.org'],
  primaryEmail: 'joe.smith@example.com',
  phones: ['+15555550100'],
  city: 'Springfield',
  region: 'Springfield County',
  country: 'USA',
  zip: '00100',
  geoLocation: 'Springfield, Springfield County, USA',
  addressLine: 'Do not visit',
  birthDate: 'Jan 1, 1980',
  headline: pools.FAKE_HEADLINES[0],
  summary: pools.FAKE_SUMMARY,
  websites: '[PERSONAL:https://joesmith.example.com,BLOG:https://blog.joesmith.example.com]',
};

let OWNER_NAME_KEYS = new Set();
let OWNER_SLUGS = new Set();
let OWNER_EMAILS = new Set();
let OWNER_PHONES = new Set();
let GLOBAL_ALIAS_REPLACEMENTS = [];

function normalizeStringSet(values, transform = (value) => value) {
  return new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => transform(String(value).trim()))
      .filter(Boolean),
  );
}

function compileGlobalReplacements(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new TypeError(`Invalid globalReplacements[${index}] entry.`);
    }
    const pattern = typeof entry.pattern === 'string' ? entry.pattern : '';
    const replacement = typeof entry.replacement === 'string' ? entry.replacement : '';
    const flags = typeof entry.flags === 'string' && entry.flags ? entry.flags : 'gi';
    if (!pattern) {
      throw new TypeError(`globalReplacements[${index}].pattern must be a non-empty string.`);
    }
    return [new RegExp(pattern, flags), replacement];
  });
}

function applyOwnerAliases(raw = {}) {
  OWNER_NAME_KEYS = normalizeStringSet(raw.nameKeys, (value) => value.toLowerCase());
  OWNER_SLUGS = normalizeStringSet(raw.slugs, (value) => decodeSlug(value).toLowerCase());
  OWNER_EMAILS = normalizeStringSet(raw.emails, (value) => value.toLowerCase());
  OWNER_PHONES = normalizeStringSet(raw.phones);
  GLOBAL_ALIAS_REPLACEMENTS = compileGlobalReplacements(raw.globalReplacements);
}

async function loadOwnerAliases() {
  applyOwnerAliases();
  if (!existsSync(OWNER_ALIASES_FILE)) {
    console.warn(OWNER_ALIAS_WARNING);
    return;
  }

  try {
    const json = JSON.parse(await readFile(OWNER_ALIASES_FILE, 'utf8'));
    applyOwnerAliases(json);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load ${path.basename(OWNER_ALIASES_FILE)}: ${detail}`);
  }
}

// ------------------------------------------------------------------
// Mapping stores
// ------------------------------------------------------------------
/** @type {Map<string, object>} */ const slugToPersona = new Map();
/** @type {Map<string, object>} */ const nameToPersona = new Map();
/** @type {Map<string, string>} */ const emailToFake = new Map();
/** @type {Map<string, string>} */ const ipToFake = new Map();
/** @type {Map<string, string>} */ const phoneToFake = new Map();

let personaCounter = 0;
let nextEmailIdx = 0;
let nextIpv4Idx = 0;
let nextIpv6Idx = 0;
let nextPhoneIdx = 0;

function nameKey(first, last, full) {
  if (full && (!first || !last)) {
    const parts = String(full).trim().split(/\s+/);
    first = first || parts[0] || '';
    last = last || parts.slice(1).join(' ') || '';
  }
  if (!first && !last) return null;
  return `${(first || '').trim().toLowerCase()}|${(last || '').trim().toLowerCase()}`;
}

function newFakePersona() {
  // Generate a stable, unique fake persona from counters.
  const idx = personaCounter++;
  const fi = idx % pools.FIRST_NAMES.length;
  const li = Math.floor(idx / pools.FIRST_NAMES.length) % pools.LAST_NAMES.length;
  const round = Math.floor(idx / (pools.FIRST_NAMES.length * pools.LAST_NAMES.length));
  const first = pools.FIRST_NAMES[fi];
  const last = pools.LAST_NAMES[li];
  const suffix = String(idx).padStart(4, '0');
  // Mimic LinkedIn slug: lowercased + 4-char hash-like suffix.
  const slug = `${first.toLowerCase()}-${last.toLowerCase()}-${suffix}`;
  return {
    firstName: first,
    lastName: last,
    fullName: `${first} ${last}`,
    slug,
    email: `${first.toLowerCase()}.${last.toLowerCase()}.${suffix}@example.com`,
    _round: round,
  };
}

function getPersona({ slug, firstName, lastName, fullName }) {
  const slugKey = slug ? decodeSlug(slug).toLowerCase() : null;
  const nKey = nameKey(firstName, lastName, fullName);

  if (slugKey && OWNER_SLUGS.has(slugKey)) return OWNER;
  if (nKey && OWNER_NAME_KEYS.has(nKey)) return OWNER;

  if (slugKey && slugToPersona.has(slugKey)) {
    const p = slugToPersona.get(slugKey);
    if (nKey && !nameToPersona.has(nKey)) nameToPersona.set(nKey, p);
    return p;
  }
  if (nKey && nameToPersona.has(nKey)) {
    const p = nameToPersona.get(nKey);
    if (slugKey) slugToPersona.set(slugKey, p);
    return p;
  }
  const p = newFakePersona();
  if (slugKey) slugToPersona.set(slugKey, p);
  if (nKey) nameToPersona.set(nKey, p);
  return p;
}

function decodeSlug(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function mapEmail(real) {
  if (!real) return real;
  const r = real.trim().toLowerCase();
  if (!r) return real;
  if (OWNER_EMAILS.has(r)) return OWNER.primaryEmail;
  if (emailToFake.has(r)) return emailToFake.get(r);
  const idx = nextEmailIdx++;
  const fake = `user${String(idx).padStart(4, '0')}@example.com`;
  emailToFake.set(r, fake);
  return fake;
}

function mapIp(real) {
  if (!real) return real;
  const r = real.trim();
  if (ipToFake.has(r)) return ipToFake.get(r);
  let fake;
  if (r.includes(':')) {
    const idx = nextIpv6Idx++;
    fake = `2001:db8::${idx.toString(16)}`;
  } else {
    const idx = nextIpv4Idx++;
    // 192.0.2.0/24 is TEST-NET-1, safe to use for examples.
    fake = `192.0.2.${idx % 256}`;
    if (idx >= 256) fake = `198.51.100.${idx % 256}`; // TEST-NET-2 fallback
  }
  ipToFake.set(r, fake);
  return fake;
}

function mapPhone(real) {
  if (!real) return real;
  const r = real.trim();
  if (!r) return real;
  if (OWNER_PHONES.has(r)) {
    return OWNER.phones[0];
  }
  if (phoneToFake.has(r)) return phoneToFake.get(r);
  const idx = nextPhoneIdx++;
  // +1 555 0100..0199 are reserved for fiction.
  const fake = `+1555010${String(idx % 100).padStart(2, '0')}`;
  phoneToFake.set(r, fake);
  return fake;
}

// ------------------------------------------------------------------
// Free-text replacers
// ------------------------------------------------------------------
const SLUG_RE = /\/in\/([^/?&\s"'<>)\]]+)/g;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
// IPv6 is messy; cover common forms found in the source.
const IPV6_RE = /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}\b/gi;

function scrubText(s) {
  if (s == null || s === '') return s;
  let out = String(s);
  out = out.replace(SLUG_RE, (m, raw) => {
    const p = getPersona({ slug: raw });
    return `/in/${p.slug}`;
  });
  out = out.replace(EMAIL_RE, (m) => mapEmail(m));
  out = out.replace(IPV6_RE, (m) => mapIp(m));
  out = out.replace(IPV4_RE, (m) => mapIp(m));
  return out;
}

// Deterministic pick from a pool based on a seed string.
function hash32(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function pickFromPool(pool, seed) {
  return pool[hash32(String(seed)) % pool.length];
}

// ------------------------------------------------------------------
// IO helpers
// ------------------------------------------------------------------
async function readSrc(rel) {
  return readFile(path.join(SRC, rel), 'utf8');
}

// Catch-all substring scrubber for owner aliases that survive structured
// per-column handlers (e.g. company names, search queries, custom domains).
// Applied to the final serialized output of every file.

function globalScrub(text) {
  let out = text;
  for (const [re, repl] of GLOBAL_ALIAS_REPLACEMENTS) out = out.replace(re, repl);
  return out;
}

async function writeDst(rel, text) {
  const full = path.join(DST, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, globalScrub(text), 'utf8');
}
function capRows(rows, n = ROW_CAP) {
  if (rows.length <= n + 1) return rows;
  return rows.slice(0, n + 1);
}
function findIdx(header, name) {
  const i = header.findIndex((h) => h.trim().toLowerCase() === name.trim().toLowerCase());
  return i;
}

// ------------------------------------------------------------------
// Per-file handlers
// ------------------------------------------------------------------

async function passthroughCsv(rel) {
  // Simply copy through the CSV unchanged (when no PII).
  const text = await readSrc(rel);
  const rows = parseCsv(text);
  await writeDst(rel, writeCsv(capRows(rows)));
}

async function handleConnections() {
  const rel = 'Connections.csv';
  const text = await readSrc(rel);
  // The file starts with a 5-line "Notes:" preamble before the real CSV header.
  // Find the actual header line ("First Name,Last Name,URL,...") and split there.
  const headerLine = 'First Name,Last Name,URL,Email Address,Company,Position,Connected On';
  const headerIdx = text.indexOf(headerLine);
  const preamble = text.slice(0, headerIdx);
  const csvPart = text.slice(headerIdx);
  const rows = parseCsv(csvPart);
  const header = rows[0];
  const fi = findIdx(header, 'First Name');
  const li = findIdx(header, 'Last Name');
  const ui = findIdx(header, 'URL');
  const ei = findIdx(header, 'Email Address');
  const dataRows = rows.slice(1, 1 + ROW_CAP);
  for (const r of dataRows) {
    const slug = (r[ui] || '').match(/\/in\/([^/?&\s]+)/)?.[1];
    const p = getPersona({
      slug,
      firstName: r[fi],
      lastName: r[li],
    });
    r[fi] = p.firstName;
    r[li] = p.lastName;
    r[ui] = `https://www.linkedin.com/in/${p.slug}`;
    r[ei] = r[ei] ? mapEmail(r[ei]) : '';
  }
  await writeDst(rel, preamble + writeCsv([header, ...dataRows]));
}

async function handleInvitations() {
  const rel = 'Invitations.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const fromI = findIdx(h, 'From');
  const toI = findIdx(h, 'To');
  const msgI = findIdx(h, 'Message');
  const invrI = findIdx(h, 'inviterProfileUrl');
  const inveeI = findIdx(h, 'inviteeProfileUrl');
  const data = rows.slice(1, 1 + ROW_CAP);
  for (const r of data) {
    const invSlug = (r[invrI] || '').match(/\/in\/([^/?&\s]+)/)?.[1];
    const inveSlug = (r[inveeI] || '').match(/\/in\/([^/?&\s]+)/)?.[1];
    const pInv = getPersona({ slug: invSlug, fullName: r[fromI] });
    const pInve = getPersona({ slug: inveSlug, fullName: r[toI] });
    r[fromI] = pInv.fullName;
    r[toI] = pInve.fullName;
    if (r[msgI]) r[msgI] = pickFromPool(pools.FAKE_MESSAGES, r[msgI]);
    r[invrI] = `https://www.linkedin.com/in/${pInv.slug}`;
    r[inveeI] = `https://www.linkedin.com/in/${pInve.slug}`;
  }
  await writeDst(rel, writeCsv([h, ...data]));
}

async function handleImportedContacts() {
  const rel = 'ImportedContacts.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const fi = findIdx(h, 'FirstName');
  const li = findIdx(h, 'LastName');
  const mi = findIdx(h, 'MiddleName');
  const ei = findIdx(h, 'Emails');
  const pi = findIdx(h, 'PhoneNumbers');
  const loci = findIdx(h, 'Location');
  const data = rows.slice(1, 1 + ROW_CAP);
  for (const r of data) {
    const hasName = (r[fi] || r[li] || '').trim().length > 0;
    if (hasName) {
      const p = getPersona({ firstName: r[fi], lastName: r[li] });
      r[fi] = p.firstName;
      r[li] = p.lastName;
      if (r[mi]) r[mi] = '';
    }
    if (r[ei])
      r[ei] = r[ei]
        .split(';')
        .map((e) => mapEmail(e.trim()))
        .join(';');
    if (r[pi])
      r[pi] = r[pi]
        .split(';')
        .map((p) => mapPhone(p.trim()))
        .join(';');
    if (r[loci]) r[loci] = '';
  }
  await writeDst(rel, writeCsv([h, ...data]));
}

async function handleEndorsements(rel, kind) {
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const fi = findIdx(h, `${kind} First Name`);
  const li = findIdx(h, `${kind} Last Name`);
  const ui = findIdx(h, `${kind} Public Url`);
  const data = rows.slice(1, 1 + ROW_CAP);
  for (const r of data) {
    const slug = (r[ui] || '').match(/\/in\/([^/?&\s]+)/)?.[1];
    const p = getPersona({ slug, firstName: r[fi], lastName: r[li] });
    r[fi] = p.firstName;
    r[li] = p.lastName;
    r[ui] = `www.linkedin.com/in/${p.slug}`;
  }
  await writeDst(rel, writeCsv([h, ...data]));
}

async function handleRecommendations(rel) {
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const fi = findIdx(h, 'First Name');
  const li = findIdx(h, 'Last Name');
  const ti = findIdx(h, 'Text');
  const data = rows.slice(1, 1 + ROW_CAP);
  for (const r of data) {
    const p = getPersona({ firstName: r[fi], lastName: r[li] });
    r[fi] = p.firstName;
    r[li] = p.lastName;
    if (r[ti]) r[ti] = pickFromPool(pools.FAKE_RECOMMENDATIONS, r[ti] + r[fi]);
  }
  await writeDst(rel, writeCsv([h, ...data]));
}

async function handleMemberFollows() {
  const rel = 'Member_Follows.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const ni = findIdx(h, 'FullName');
  const data = rows.slice(1, 1 + ROW_CAP);
  for (const r of data) {
    const p = getPersona({ fullName: r[ni] });
    r[ni] = p.fullName;
  }
  await writeDst(rel, writeCsv([h, ...data]));
}

async function handleProfile() {
  const rel = 'Profile.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const get = (name) => findIdx(h, name);
  const r = rows[1] || h.map(() => '');
  r[get('First Name')] = OWNER.firstName;
  r[get('Last Name')] = OWNER.lastName;
  if (get('Maiden Name') >= 0) r[get('Maiden Name')] = '';
  r[get('Address')] = OWNER.addressLine;
  r[get('Birth Date')] = OWNER.birthDate;
  r[get('Headline')] = OWNER.headline;
  r[get('Summary')] = OWNER.summary;
  // Industry kept.
  r[get('Zip Code')] = OWNER.zip;
  r[get('Geo Location')] = OWNER.geoLocation;
  if (get('Twitter Handles') >= 0) r[get('Twitter Handles')] = '';
  r[get('Websites')] = OWNER.websites;
  if (get('Instant Messengers') >= 0) r[get('Instant Messengers')] = '';
  await writeDst(rel, writeCsv([h, r]));
}

async function handleEmailAddresses() {
  const rel = 'Email Addresses.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const ei = findIdx(h, 'Email Address');
  const pi = findIdx(h, 'Primary');
  const data = rows.slice(1);
  // Re-issue owner emails consistently. Keep same row count.
  const ownerEmails = OWNER.emails;
  data.forEach((r, idx) => {
    r[ei] = ownerEmails[idx % ownerEmails.length];
    // Force exactly one Primary=Yes.
    if (pi >= 0) r[pi] = idx === ownerEmails.length - 1 ? 'Yes' : 'No';
  });
  await writeDst(rel, writeCsv([h, ...data]));
}

async function handlePhoneNumbers() {
  const rel = 'PhoneNumbers.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const ni = findIdx(h, 'Number');
  const data = rows.slice(1);
  for (const r of data) {
    if (r[ni] && r[ni].trim() && !/[a-z]/i.test(r[ni])) r[ni] = mapPhone(r[ni]);
    // Keep narrative entries like "Do not call" untouched.
  }
  await writeDst(rel, writeCsv([h, ...data]));
}

async function handleReceipts() {
  const rel = 'Receipts_v2.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const fi = findIdx(h, 'First Name');
  const li = findIdx(h, 'Last Name');
  const ci = findIdx(h, 'Billing Country');
  const pi = findIdx(h, 'Postal Code');
  for (const r of rows.slice(1)) {
    r[fi] = OWNER.firstName;
    r[li] = OWNER.lastName;
    r[ci] = 'US';
    r[pi] = OWNER.zip;
  }
  await writeDst(rel, writeCsv(rows));
}

async function handleVerifications() {
  const rel = 'Verifications/Verifications.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const ei = findIdx(h, 'Email address');
  for (const r of rows.slice(1)) {
    if (r[ei]) r[ei] = OWNER.primaryEmail;
  }
  await writeDst(rel, writeCsv(rows));
}

async function handleLogins(rel, ipColName = 'IP Address') {
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const ii = findIdx(h, ipColName);
  for (const r of rows.slice(1)) {
    if (ii >= 0 && r[ii]) r[ii] = mapIp(r[ii]);
  }
  await writeDst(rel, writeCsv(capRows(rows)));
}

async function handleRegistration() {
  const rel = 'Registration.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const ii = findIdx(h, 'Registration Ip');
  for (const r of rows.slice(1)) {
    if (ii >= 0 && r[ii]) r[ii] = mapIp(r[ii]);
  }
  await writeDst(rel, writeCsv(rows));
}

async function handleAdTargeting() {
  const rel = 'Ad_Targeting.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const locI = findIdx(h, 'Profile Locations');
  for (const r of rows.slice(1)) {
    if (locI >= 0 && r[locI]) r[locI] = 'EMEA; Europe; European Union';
  }
  await writeDst(rel, writeCsv(rows));
}

async function handlePositions() {
  const rel = 'Positions.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const di = findIdx(h, 'Description');
  const li = findIdx(h, 'Location');
  for (const r of rows.slice(1)) {
    if (di >= 0 && r[di]) r[di] = pickFromPool(pools.FAKE_POSITION_DESCRIPTIONS, r[di]);
    if (li >= 0 && r[li]) r[li] = OWNER.geoLocation;
  }
  await writeDst(rel, writeCsv(rows));
}

async function handleJobApplications() {
  const rel = 'Jobs/Job Applications.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const ei = findIdx(h, 'Contact Email');
  const pi = findIdx(h, 'Contact Phone Number');
  const ri = findIdx(h, 'Resume Name');
  const qi = findIdx(h, 'Question And Answers');
  for (const r of rows.slice(1, 1 + ROW_CAP)) {
    if (ei >= 0) r[ei] = OWNER.primaryEmail;
    if (pi >= 0) r[pi] = OWNER.phones[0];
    if (ri >= 0 && r[ri]) r[ri] = 'Joe Smith - Resume.pdf';
    if (qi >= 0 && r[qi]) {
      // Replace giant personal cover-letter blobs with a short generic Q&A.
      r[qi] =
        'Why are you a good fit?:I have relevant experience and am excited about the role. | First name:Joe | Last name:Smith | Email address:' +
        OWNER.primaryEmail +
        ' | Mobile phone number:' +
        OWNER.phones[0];
    }
  }
  await writeDst(rel, writeCsv([h, ...rows.slice(1, 1 + ROW_CAP)]));
}

async function handleJobSeekerPrefs() {
  const rel = 'Jobs/Job Seeker Preferences.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const introI = findIdx(h, 'Introduction Statement');
  const phI = findIdx(h, 'Phone Number');
  const locI = findIdx(h, 'Locations');
  for (const r of rows.slice(1)) {
    if (introI >= 0 && r[introI])
      r[introI] = 'No cold calls please. Reach me via my profile inbox.';
    if (phI >= 0 && r[phI]) r[phI] = OWNER.phones[0];
    if (locI >= 0 && r[locI]) r[locI] = OWNER.city;
  }
  await writeDst(rel, writeCsv(rows));
}

async function handleMessages(rel) {
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  if (rows.length < 2) {
    await writeDst(rel, writeCsv(rows));
    return;
  }
  const fromI = findIdx(h, 'FROM');
  const sendI = findIdx(h, 'SENDER PROFILE URL');
  const toI = findIdx(h, 'TO');
  const recI = findIdx(h, 'RECIPIENT PROFILE URLS');
  const subI = findIdx(h, 'SUBJECT');
  const contI = findIdx(h, 'CONTENT');
  const dateI = findIdx(h, 'DATE');
  const data = rows.slice(1, 1 + ROW_CAP);
  for (const r of data) {
    const sSlug = (r[sendI] || '').match(/\/in\/([^/?&\s]+)/)?.[1];
    const sP = getPersona({ slug: sSlug, fullName: r[fromI] });
    r[fromI] = sP.fullName;
    r[sendI] = `https://www.linkedin.com/in/${sP.slug}`;
    // RECIPIENT may be semicolon-delimited.
    if (toI >= 0) {
      const toNames = (r[toI] || '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      const recUrls = (r[recI] || '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      const out = [];
      const outUrls = [];
      const max = Math.max(toNames.length, recUrls.length);
      for (let i = 0; i < max; i++) {
        const slug = (recUrls[i] || '').match(/\/in\/([^/?&\s]+)/)?.[1];
        const p = getPersona({ slug, fullName: toNames[i] });
        out.push(p.fullName);
        outUrls.push(`https://www.linkedin.com/in/${p.slug}`);
      }
      r[toI] = out.join(';');
      r[recI] = outUrls.join(';');
    }
    if (subI >= 0 && r[subI]) r[subI] = pickFromPool(pools.FAKE_MESSAGES, r[subI]).slice(0, 60);
    if (contI >= 0) {
      const seed = (r[dateI] || '') + '|' + (r[fromI] || '');
      r[contI] = pickFromPool(pools.FAKE_MESSAGES, seed);
    }
  }
  await writeDst(rel, writeCsv([h, ...data]));
}

async function handleComments() {
  const rel = 'Comments.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const mi = findIdx(h, 'Message');
  const li = findIdx(h, 'Link');
  const di = findIdx(h, 'Date');
  const data = rows.slice(1, 1 + ROW_CAP);
  for (const r of data) {
    if (li >= 0 && r[li]) r[li] = scrubText(r[li]);
    if (mi >= 0) r[mi] = pickFromPool(pools.FAKE_COMMENTS, (r[di] || '') + (r[li] || ''));
  }
  await writeDst(rel, writeCsv([h, ...data]));
}

async function handleShares() {
  const rel = 'Shares.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const di = findIdx(h, 'Date');
  const li = findIdx(h, 'ShareLink');
  const ci = findIdx(h, 'ShareCommentary');
  const si = findIdx(h, 'SharedUrl');
  const mi = findIdx(h, 'MediaUrl');
  const data = rows.slice(1, 1 + ROW_CAP);
  for (const r of data) {
    if (li >= 0 && r[li]) r[li] = scrubText(r[li]);
    if (si >= 0 && r[si]) r[si] = scrubText(r[si]);
    if (mi >= 0 && r[mi]) r[mi] = scrubText(r[mi]);
    if (ci >= 0) r[ci] = pickFromPool(pools.FAKE_SHARES, (r[di] || '') + (r[li] || ''));
  }
  await writeDst(rel, writeCsv([h, ...data]));
}

async function handleRichMedia() {
  const rel = 'Rich_Media.csv';
  const rows = parseCsv(await readSrc(rel));
  const h = rows[0];
  const di = findIdx(h, 'Media Description');
  const data = rows.slice(1, 1 + ROW_CAP);
  for (const r of data) {
    if (di >= 0 && r[di]) r[di] = pickFromPool(pools.FAKE_SHARES, r[di]).slice(0, 140);
  }
  await writeDst(rel, writeCsv([h, ...data]));
}

async function handleSearchQueries() {
  const rel = 'SearchQueries.csv';
  const rows = parseCsv(await readSrc(rel));
  // Search queries themselves are not strongly PII; truncate to ROW_CAP.
  await writeDst(rel, writeCsv(capRows(rows)));
}

async function handleSimpleActivity(rel) {
  // For Reactions, Votes, InstantReposts, Saved_Items, Ads Clicked,
  // Company Follows, Hashtag_Follows, Events, Honors, Education,
  // Skills, Languages, Courses, Profile Summary, Inferences_about_you,
  // LAN Ads Engagement.
  await passthroughCsv(rel);
}

async function handleEmptyMessageStubs(rel) {
  // guide_messages, learning_coach_messages, learning_role_play_messages,
  // LearningCoachMessages: header-only or "No conversations found".
  const text = await readSrc(rel);
  await writeDst(rel, text);
}

async function handleSavedJobs() {
  const rel = 'Jobs/Saved Jobs.csv';
  await passthroughCsv(rel);
}

async function handleSavedJobAlerts() {
  const rel = 'SavedJobAlerts.csv';
  await passthroughCsv(rel);
}

async function handleArticles() {
  const rel = 'Articles/Articles/the-cost-of-reliability-joe-smith-abcd.html';
  const html = `<html>
<head>
  <title>The cost of reliability</title>
  <style>
    body { margin: 0 auto; width: 744px; font-family: 'Source Serif Pro', serif; line-height: 32px; color: rgba(0,0,0,0.7); font-size: 21px; }
    h1, h2, h3 { font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; }
    h1 a, h1 a:visited { color: inherit; text-decoration: none; }
    h1 { font-weight: 600; font-size: 42px; margin: 32px 0 20px; }
    .created, .published { color: rgba(0,0,0,0.55); font-size: 15px; margin: 20px 0; }
    blockquote { font-family: Georgia, serif; font-style: italic; font-size: 24px; margin: 48px 120px; text-align: center; }
    a { color: #008CC9; text-decoration: none; }
    a:hover { text-decoration: underline; }
    pre { background: #F3F6F8; font-family: monospace; padding: 32px; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <h1><a href="https://www.linkedin.com/pulse/the-cost-of-reliability-joe-smith-abcd">The cost of reliability</a></h1>
  <p class="created">Created on 2024-09-20 06:04</p>
  <p class="published">Published on 2024-09-20 06:12</p>
  <div>
    <p>This is a sample article body used as test data. It mimics the shape of a real LinkedIn article export.</p>
    <blockquote><p>"Reliability is a property of the system, not a feature you can add later."</p></blockquote>
    <ul>
      <li><p><strong>Refactoring:</strong> code may need to be refactored to pay back tech debt.</p></li>
      <li><p><strong>Reorg:</strong> if you are not organized for reliability, there is a cap to your reliability.</p></li>
      <li><p><strong>Tooling:</strong> tools have a cost to purchase, learn, configure, and govern.</p></li>
    </ul>
    <p>Read more at <a href="https://blog.joesmith.example.com/p/reliability" target="_blank">the example blog</a>.</p>
  </div>
</body>
</html>
`;
  await writeDst(rel, html);
}

// ------------------------------------------------------------------
// Mapping persistence
// ------------------------------------------------------------------
async function loadMapping() {
  if (!existsSync(MAPPING_FILE)) return;
  const json = JSON.parse(await readFile(MAPPING_FILE, 'utf8'));
  personaCounter = json.personaCounter ?? 0;
  nextEmailIdx = json.nextEmailIdx ?? 0;
  nextIpv4Idx = json.nextIpv4Idx ?? 0;
  nextIpv6Idx = json.nextIpv6Idx ?? 0;
  nextPhoneIdx = json.nextPhoneIdx ?? 0;
  for (const [k, v] of Object.entries(json.slugToPersona ?? {})) slugToPersona.set(k, v);
  for (const [k, v] of Object.entries(json.nameToPersona ?? {})) nameToPersona.set(k, v);
  for (const [k, v] of Object.entries(json.emailToFake ?? {})) emailToFake.set(k, v);
  for (const [k, v] of Object.entries(json.ipToFake ?? {})) ipToFake.set(k, v);
  for (const [k, v] of Object.entries(json.phoneToFake ?? {})) phoneToFake.set(k, v);
}

async function saveMapping() {
  const obj = {
    owner: OWNER,
    personaCounter,
    nextEmailIdx,
    nextIpv4Idx,
    nextIpv6Idx,
    nextPhoneIdx,
    slugToPersona: Object.fromEntries(slugToPersona),
    nameToPersona: Object.fromEntries(nameToPersona),
    emailToFake: Object.fromEntries(emailToFake),
    ipToFake: Object.fromEntries(ipToFake),
    phoneToFake: Object.fromEntries(phoneToFake),
  };
  await writeFile(MAPPING_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

// ------------------------------------------------------------------
// Orchestration
// ------------------------------------------------------------------
async function main() {
  await mkdir(DST, { recursive: true });
  await loadOwnerAliases();
  await loadMapping();

  // Person-rich files first so personas exist when the bulk content files
  // reference the same people.
  await handleConnections();
  await handleEndorsements('Endorsement_Given_Info.csv', 'Endorsee');
  await handleEndorsements('Endorsement_Received_Info.csv', 'Endorser');
  await handleInvitations();
  await handleImportedContacts();
  await handleRecommendations('Recommendations_Given.csv');
  await handleRecommendations('Recommendations_Received.csv');
  await handleMemberFollows();
  await handleProfile();
  await handleEmailAddresses();
  await handlePhoneNumbers();
  await handleReceipts();
  await handleVerifications();
  await handlePositions();

  // Network/security
  await handleLogins('Logins.csv', 'IP Address');
  await handleLogins('Security Challenges.csv', 'IP Address');
  await handleRegistration();

  // Jobs
  await handleJobApplications();
  await handleJobSeekerPrefs();
  await handleSavedJobs();
  await handleSavedJobAlerts();

  // Bulk activity content
  await handleMessages('messages.csv');
  await handleComments();
  await handleShares();
  await handleRichMedia();
  await handleSearchQueries();

  // Plain pass-through (with row cap)
  const passthroughList = [
    'Reactions.csv',
    'Votes.csv',
    'InstantReposts.csv',
    'Saved_Items.csv',
    'Ads Clicked.csv',
    'Company Follows.csv',
    'Hashtag_Follows.csv',
    'Events.csv',
    'Honors.csv',
    'Education.csv',
    'Skills.csv',
    'Languages.csv',
    'Courses.csv',
    'Profile Summary.csv',
    'Inferences_about_you.csv',
    'LAN Ads Engagement.csv',
    'Learning.csv',
  ];
  for (const f of passthroughList) await passthroughCsv(f);

  // Ad targeting (strip Stockholm-specific location info)
  await handleAdTargeting();

  // Header-only / empty stubs
  for (const f of [
    'LearningCoachMessages.csv',
    'guide_messages.csv',
    'learning_coach_messages.csv',
    'learning_role_play_messages.csv',
  ]) {
    await handleEmptyMessageStubs(f);
  }

  // Article HTML
  await handleArticles();

  await saveMapping();

  // Sanity: assert every source file (other than the article) has an output.
  await sanityCheckFileCoverage();

  console.log(
    `Done. ${personaCounter} fake personas, ${emailToFake.size} fake emails, ${ipToFake.size} fake IPs, ${phoneToFake.size} fake phones.`,
  );
}

async function sanityCheckFileCoverage() {
  const srcFiles = await listAllFilesRel(SRC);
  const dstFiles = await listAllFilesRel(DST);
  const dstSet = new Set(dstFiles);
  const missing = [];
  for (const f of srcFiles) {
    if (f.startsWith('Articles/')) continue;
    if (!dstSet.has(f)) missing.push(f);
  }
  if (missing.length) {
    console.warn('WARNING: missing in test-data:\n  ' + missing.join('\n  '));
  }
}

async function listAllFilesRel(root) {
  const out = [];
  async function walk(dir) {
    for (const ent of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full);
      else out.push(path.relative(root, full));
    }
  }
  await walk(root);
  return out.sort();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
