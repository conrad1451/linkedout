import { parseTemporalValue } from '../../lib/datetime';
import type { DatasetRow } from '../../lib/store';

export type MessageFilter = 'inbox' | 'connections';

export interface MessageSourceRow {
  row: DatasetRow;
  datasetId: string;
  datasetTitle: string;
}

export interface MessageParticipant {
  name: string;
  profileUrl?: string;
  isSelf: boolean;
}

export interface MessageItem {
  id: string;
  datasetId: string;
  datasetTitle: string;
  rowIndex: number;
  conversationId: string;
  sender: MessageParticipant;
  recipients: MessageParticipant[];
  date: string;
  epochMs: number;
  subject: string;
  content: string;
  folder: string;
  attachments: string[];
  isSelf: boolean;
}

export interface MessageConversation {
  id: string;
  linkedInThreadUrl?: string;
  title: string;
  subtitle: string;
  participants: MessageParticipant[];
  otherParticipants: MessageParticipant[];
  messages: MessageItem[];
  latestMessage: MessageItem;
  latestEpochMs: number;
  preview: string;
  folders: string[];
  sourceTitles: string[];
  searchText: string;
  isConnection: boolean;
}

export interface MessageConnectionIndex {
  names: Set<string>;
  urls: Set<string>;
  hasExplicitData: boolean;
}

export interface BuildMessageConversationsOptions {
  ownerName?: string;
  connectionIndex?: MessageConnectionIndex;
}

interface DraftConversation {
  id: string;
  linkedInThreadUrl?: string;
  explicitTitle: string;
  participants: Map<string, MessageParticipant>;
  messages: MessageItem[];
  folders: Set<string>;
  sourceTitles: Set<string>;
  searchParts: string[];
}

const DEFAULT_CONNECTION_INDEX: MessageConnectionIndex = {
  names: new Set<string>(),
  urls: new Set<string>(),
  hasExplicitData: false,
};

export function buildMessageConversations(
  sourceRows: MessageSourceRow[],
  options: BuildMessageConversationsOptions = {},
): MessageConversation[] {
  const ownerName = normalizeName(options.ownerName ?? '');
  const connectionIndex = options.connectionIndex ?? DEFAULT_CONNECTION_INDEX;
  const drafts = new Map<string, DraftConversation>();

  for (const source of sourceRows) {
    const message = messageFromSource(source, ownerName);
    const draft = getDraft(drafts, message.conversationId, text(source.row, 'CONVERSATION TITLE'));
    draft.linkedInThreadUrl ??= linkedInThreadUrl(text(source.row, 'CONVERSATION ID'));
    draft.messages.push(message);
    draft.sourceTitles.add(source.datasetTitle);
    if (message.folder) draft.folders.add(message.folder);
    draft.searchParts.push(rowSearchText(source.row), source.datasetTitle);
    upsertParticipant(draft, message.sender);
    for (const recipient of message.recipients) upsertParticipant(draft, recipient);
  }

  const conversations: MessageConversation[] = [];
  for (const draft of drafts.values()) {
    const messages = [...draft.messages].sort(compareMessagesAsc);
    const latestMessage = messages.at(-1);
    if (!latestMessage) continue;

    const participants = [...draft.participants.values()].sort(compareParticipants);
    const otherParticipants = participants.filter((participant) => !participant.isSelf);
    const participantSummary = summarizeParticipants(
      otherParticipants.length > 0 ? otherParticipants : participants,
    );
    const title = draft.explicitTitle || participantSummary || 'LinkedIn Conversation';
    const subtitle = draft.explicitTitle
      ? participantSummary
      : conversationSubtitle(participants, messages.length);
    const folders = [...draft.folders].sort((left, right) => left.localeCompare(right));
    const sourceTitles = [...draft.sourceTitles].sort((left, right) => left.localeCompare(right));
    const preview =
      latestMessage.content || latestMessage.subject || attachmentPreview(latestMessage);
    const searchText = [
      draft.id,
      title,
      subtitle,
      preview,
      folders.join(' '),
      sourceTitles.join(' '),
      participants.map((participant) => participant.name).join(' '),
      messages.map((message) => [message.subject, message.content].join(' ')).join(' '),
      draft.searchParts.join(' '),
    ]
      .join(' ')
      .toLowerCase();

    const conversation: MessageConversation = {
      id: draft.id,
      linkedInThreadUrl: draft.linkedInThreadUrl,
      title,
      subtitle,
      participants,
      otherParticipants,
      messages,
      latestMessage,
      latestEpochMs: latestMessage.epochMs,
      preview,
      folders,
      sourceTitles,
      searchText,
      isConnection: false,
    };
    conversation.isConnection = isConnectionConversation(conversation, connectionIndex);
    conversations.push(conversation);
  }

  return conversations.sort(compareConversationsDesc);
}

export function buildMessageConnectionIndex(rows: DatasetRow[]): MessageConnectionIndex {
  const names = new Set<string>();
  const urls = new Set<string>();

  for (const row of rows) {
    const name =
      [text(row, 'First Name'), text(row, 'Last Name')].filter(Boolean).join(' ') ||
      text(row, 'Name') ||
      text(row, 'Full Name');
    const url = text(row, 'URL') || text(row, 'Profile URL') || text(row, 'Public Profile URL');
    const normalizedName = normalizeName(name);
    const normalizedUrl = normalizeUrl(url);
    if (normalizedName) names.add(normalizedName);
    if (normalizedUrl) urls.add(normalizedUrl);
  }

  return { names, urls, hasExplicitData: names.size > 0 || urls.size > 0 };
}

export function filterMessageConversations(
  conversations: MessageConversation[],
  filter: MessageFilter,
  query: string,
): MessageConversation[] {
  const terms = tokenizeQuery(query);
  return conversations.filter(
    (conversation) =>
      conversationMatchesFilter(conversation, filter) &&
      conversationMatchesTerms(conversation, terms),
  );
}

export function messageFilterFromParam(value: string | null): MessageFilter {
  if (value === 'connections') return value;
  return 'inbox';
}

function messageFromSource(source: MessageSourceRow, ownerName: string): MessageItem {
  const row = source.row;
  const sender = makeParticipant(text(row, 'FROM'), text(row, 'SENDER PROFILE URL'), ownerName);
  const recipients = recipientParticipants(row, ownerName);
  const conversationId = conversationKey(source, sender, recipients);
  const date = text(row, 'DATE');
  const epochMs =
    typeof row.__date === 'number'
      ? row.__date
      : (parseTemporalValue(date)?.epochMs ?? Number.NEGATIVE_INFINITY);

  return {
    id: `${source.datasetId}:${row.__row}`,
    datasetId: source.datasetId,
    datasetTitle: source.datasetTitle,
    rowIndex: row.__row,
    conversationId,
    sender,
    recipients,
    date,
    epochMs,
    subject: displayText(text(row, 'SUBJECT')),
    content: displayText(text(row, 'CONTENT')),
    folder: text(row, 'FOLDER'),
    attachments: splitMultiValue(text(row, 'ATTACHMENTS')).filter((attachment) =>
      /^https?:\/\//i.test(attachment),
    ),
    isSelf: sender.isSelf,
  };
}

function getDraft(
  drafts: Map<string, DraftConversation>,
  id: string,
  title: string,
): DraftConversation {
  let draft = drafts.get(id);
  if (!draft) {
    draft = {
      id,
      linkedInThreadUrl: undefined,
      explicitTitle: displayText(title),
      participants: new Map<string, MessageParticipant>(),
      messages: [],
      folders: new Set<string>(),
      sourceTitles: new Set<string>(),
      searchParts: [],
    };
    drafts.set(id, draft);
  } else if (!draft.explicitTitle && title) {
    draft.explicitTitle = displayText(title);
  }
  return draft;
}

function linkedInThreadUrl(conversationId: string): string | undefined {
  if (!conversationId) return undefined;
  const pathSegment = encodeURIComponent(conversationId).replace(/%3D/gi, '=');
  return `https://www.linkedin.com/messaging/thread/${pathSegment}/`;
}

function conversationKey(
  source: MessageSourceRow,
  sender: MessageParticipant,
  recipients: MessageParticipant[],
): string {
  const explicitId = text(source.row, 'CONVERSATION ID');
  if (explicitId) return explicitId;

  const participantKey = [sender, ...recipients].map(participantIdentity).sort().join('|');
  const title = text(source.row, 'CONVERSATION TITLE') || text(source.row, 'SUBJECT');
  return `${source.datasetId}:${title || participantKey || source.row.__row}`;
}

function recipientParticipants(row: DatasetRow, ownerName: string): MessageParticipant[] {
  const names = splitMultiValue(text(row, 'TO'));
  const urls = splitMultiValue(text(row, 'RECIPIENT PROFILE URLS'));
  const count = Math.max(names.length, urls.length);
  const participants: MessageParticipant[] = [];
  for (let index = 0; index < count; index++) {
    participants.push(makeParticipant(names[index] ?? '', urls[index] ?? '', ownerName));
  }
  return participants;
}

function makeParticipant(name: string, profileUrl: string, ownerName: string): MessageParticipant {
  const normalizedUrl = normalizeUrl(profileUrl);
  const cleanName = displayText(name) || nameFromProfileUrl(normalizedUrl) || 'LinkedIn Member';
  return {
    name: cleanName,
    profileUrl: normalizedUrl || undefined,
    isSelf: ownerName ? normalizeName(cleanName) === ownerName : false,
  };
}

function upsertParticipant(draft: DraftConversation, participant: MessageParticipant): void {
  const key = participantIdentity(participant);
  const current = draft.participants.get(key);
  if (!current) {
    draft.participants.set(key, { ...participant });
    return;
  }
  if (current.name === 'LinkedIn Member' && participant.name !== 'LinkedIn Member')
    current.name = participant.name;
  if (!current.profileUrl && participant.profileUrl) current.profileUrl = participant.profileUrl;
  current.isSelf ||= participant.isSelf;
}

function participantIdentity(participant: MessageParticipant): string {
  if (participant.profileUrl) return `url:${participant.profileUrl}`;
  return `name:${normalizeName(participant.name)}`;
}

function compareMessagesAsc(left: MessageItem, right: MessageItem): number {
  return (
    sortableEpoch(left.epochMs) - sortableEpoch(right.epochMs) || left.rowIndex - right.rowIndex
  );
}

function compareConversationsDesc(left: MessageConversation, right: MessageConversation): number {
  return (
    sortableEpoch(right.latestEpochMs) - sortableEpoch(left.latestEpochMs) ||
    left.title.localeCompare(right.title)
  );
}

function compareParticipants(left: MessageParticipant, right: MessageParticipant): number {
  if (left.isSelf !== right.isSelf) return left.isSelf ? 1 : -1;
  return left.name.localeCompare(right.name);
}

function sortableEpoch(value: number): number {
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

function summarizeParticipants(participants: MessageParticipant[]): string {
  const names = participants.map((participant) => participant.name).filter(Boolean);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
}

function conversationSubtitle(participants: MessageParticipant[], messageCount: number): string {
  const otherCount = participants.filter((participant) => !participant.isSelf).length;
  const people = otherCount > 0 ? otherCount : participants.length;
  const peopleLabel = people === 1 ? '1 person' : `${people} people`;
  const messageLabel =
    messageCount === 1 ? '1 message' : `${messageCount.toLocaleString()} messages`;
  return `${peopleLabel} · ${messageLabel}`;
}

function attachmentPreview(message: MessageItem): string {
  if (message.attachments.length === 0) return 'Message';
  return message.attachments.length === 1
    ? 'Attachment'
    : `${message.attachments.length} attachments`;
}

function conversationMatchesFilter(
  conversation: MessageConversation,
  filter: MessageFilter,
): boolean {
  if (filter === 'inbox') {
    return (
      conversation.folders.length === 0 ||
      conversation.folders.some((folder) => normalizeFolder(folder) === 'inbox')
    );
  }
  return conversation.isConnection;
}

function conversationMatchesTerms(conversation: MessageConversation, terms: string[]): boolean {
  if (terms.length === 0) return true;
  return terms.every((term) => conversation.searchText.includes(term));
}

function tokenizeQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function isConnectionConversation(
  conversation: MessageConversation,
  index: MessageConnectionIndex,
): boolean {
  const candidates =
    conversation.otherParticipants.length > 0
      ? conversation.otherParticipants
      : conversation.participants;
  if (index.hasExplicitData) {
    return candidates.some((participant) => {
      const name = normalizeName(participant.name);
      const url = normalizeUrl(participant.profileUrl ?? '');
      return Boolean((name && index.names.has(name)) || (url && index.urls.has(url)));
    });
  }
  return false;
}

function rowSearchText(row: DatasetRow): string {
  return Object.entries(row)
    .filter(([key]) => !key.startsWith('__'))
    .map(([, value]) => valueToText(value))
    .filter(Boolean)
    .join(' ');
}

function valueToText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function text(row: DatasetRow, key: string): string {
  return valueToText(row[key]);
}

function displayText(value: string): string {
  const trimmed = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!trimmed) return '';
  return stripOuterQuotes(trimmed)
    .split('\n')
    .map((line) => stripOuterQuotes(line.trimEnd()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripOuterQuotes(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  return value;
}

function splitMultiValue(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const separator = trimmed.includes(';') ? /\s*;\s*/ : /\s*,\s*/;
  return trimmed
    .split(separator)
    .map((part) => displayText(part))
    .filter(Boolean);
}

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '').toLowerCase();
}

function normalizeFolder(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function nameFromProfileUrl(value: string): string {
  const slug = value.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1];
  if (!slug) return '';
  const words = slug
    .replace(/-\d+$/g, '')
    .split('-')
    .filter((part) => part && !/^\d+$/.test(part));
  return words.map((word) => word.slice(0, 1).toUpperCase() + word.slice(1)).join(' ');
}
