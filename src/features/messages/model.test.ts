import { describe, expect, it } from 'vitest';
import type { DatasetRow } from '../../lib/store';
import {
  buildMessageConnectionIndex,
  buildMessageConversations,
  filterMessageConversations,
  messageFilterFromParam,
  type MessageSourceRow,
} from './model';

describe('message conversation model', () => {
  it('groups messages by conversation id and sorts conversations by latest date', () => {
    const conversations = buildMessageConversations(
      [
        source(0, {
          'CONVERSATION ID': 'emma-thread',
          FROM: 'Joe Smith',
          TO: 'Emma Taylor',
          DATE: '2025-12-15 08:00:00 UTC',
          CONTENT: 'Can we move our call?',
          FOLDER: 'INBOX',
        }),
        source(1, {
          'CONVERSATION ID': 'alex-thread',
          FROM: 'Alex Rivera',
          TO: 'Joe Smith',
          DATE: '2025-12-17 09:30:00 UTC',
          CONTENT: 'Sharing the deck now.',
          FOLDER: 'INBOX',
        }),
        source(2, {
          'CONVERSATION ID': 'emma-thread',
          FROM: 'Emma Taylor',
          TO: 'Joe Smith',
          DATE: '2025-12-16 12:00:00 UTC',
          CONTENT: 'Tomorrow at 3 works.',
          FOLDER: 'INBOX',
        }),
      ],
      { ownerName: 'Joe Smith' },
    );

    expect(conversations.map((conversation) => conversation.title)).toEqual([
      'Alex Rivera',
      'Emma Taylor',
    ]);
    const emma = conversations.find((conversation) => conversation.id === 'emma-thread');
    expect(emma?.linkedInThreadUrl).toBe('https://www.linkedin.com/messaging/thread/emma-thread/');
    expect(emma?.messages.map((message) => message.content)).toEqual([
      'Can we move our call?',
      'Tomorrow at 3 works.',
    ]);
    expect(emma?.messages[0]?.isSelf).toBe(true);
  });

  it('keeps multi-person introductions in one conversation', () => {
    const conversations = buildMessageConversations(
      [
        source(0, {
          'CONVERSATION ID': 'intro-thread',
          FROM: 'Alice Morgan',
          TO: 'Joe Smith; Bob Stone',
          DATE: '2025-10-01 10:00:00 UTC',
          CONTENT: 'Joe, meet Bob.',
          FOLDER: 'INBOX',
        }),
        source(1, {
          'CONVERSATION ID': 'intro-thread',
          FROM: 'Bob Stone',
          TO: 'Alice Morgan; Joe Smith',
          DATE: '2025-10-01 10:05:00 UTC',
          CONTENT: 'Great to meet you both.',
          FOLDER: 'INBOX',
        }),
      ],
      { ownerName: 'Joe Smith' },
    );

    expect(conversations).toHaveLength(1);
    expect(conversations[0]?.title).toBe('Alice Morgan, Bob Stone');
    expect(conversations[0]?.participants.map((participant) => participant.name)).toEqual([
      'Alice Morgan',
      'Bob Stone',
      'Joe Smith',
    ]);
    expect(conversations[0]?.messages).toHaveLength(2);
  });

  it('filters by data-backed inbox and connections chips plus search terms', () => {
    const connectionIndex = buildMessageConnectionIndex([
      row(0, {
        'First Name': 'Emma',
        'Last Name': 'Taylor',
        URL: 'https://www.linkedin.com/in/emma-taylor',
      }),
    ]);
    const conversations = buildMessageConversations(
      [
        source(0, {
          'CONVERSATION ID': 'connection-thread',
          FROM: 'Emma Taylor',
          'SENDER PROFILE URL': 'https://www.linkedin.com/in/emma-taylor',
          TO: 'Joe Smith',
          DATE: '2025-12-16 08:00:00 UTC',
          CONTENT: 'The architecture deck is attached.',
          FOLDER: 'INBOX',
        }),
        source(1, {
          'CONVERSATION ID': 'other-thread',
          FROM: 'Recruiter Person',
          TO: 'Joe Smith',
          DATE: '2025-12-15 08:00:00 UTC',
          SUBJECT: 'Job opportunity',
          CONTENT: 'Would you consider a staff role?',
          FOLDER: 'INBOX',
        }),
      ],
      { ownerName: 'Joe Smith', connectionIndex },
    );

    expect(
      filterMessageConversations(conversations, 'inbox', 'deck').map(
        (conversation) => conversation.id,
      ),
    ).toEqual(['connection-thread']);
    expect(
      filterMessageConversations(conversations, 'connections', '').map(
        (conversation) => conversation.id,
      ),
    ).toEqual(['connection-thread']);
  });

  it('does not infer connection filters without imported connection data', () => {
    const conversations = buildMessageConversations(
      [
        source(0, {
          'CONVERSATION ID': 'profile-url-thread',
          FROM: 'Emma Taylor',
          'SENDER PROFILE URL': 'https://www.linkedin.com/in/emma-taylor',
          TO: 'Joe Smith',
          DATE: '2025-12-16 08:00:00 UTC',
          CONTENT: 'A LinkedIn profile URL alone is not connection data.',
          FOLDER: 'INBOX',
        }),
      ],
      { ownerName: 'Joe Smith' },
    );

    expect(filterMessageConversations(conversations, 'connections', '')).toEqual([]);
  });

  it('only builds LinkedIn conversation links from exported conversation ids', () => {
    const conversations = buildMessageConversations(
      [
        source(0, {
          FROM: 'Alex Rivera',
          TO: 'Joe Smith',
          DATE: '2025-12-17 09:30:00 UTC',
          CONTENT: 'This row falls back to participant grouping.',
          FOLDER: 'INBOX',
        }),
      ],
      { ownerName: 'Joe Smith' },
    );

    expect(conversations[0]?.id).not.toBe('');
    expect(conversations[0]?.linkedInThreadUrl).toBeUndefined();
  });

  it('preserves LinkedIn thread id padding in generated links', () => {
    const conversations = buildMessageConversations(
      [
        source(0, {
          'CONVERSATION ID': '2-MTM1ZDVlNWEtOTcwZS00NDcwLTgxN2ItYmU4OTY0NjRkNWUzXzEwMA==',
          FROM: 'Alex Rivera',
          TO: 'Joe Smith',
          DATE: '2025-12-17 09:30:00 UTC',
          CONTENT: 'See you there.',
          FOLDER: 'INBOX',
        }),
      ],
      { ownerName: 'Joe Smith' },
    );

    expect(conversations[0]?.linkedInThreadUrl).toBe(
      'https://www.linkedin.com/messaging/thread/2-MTM1ZDVlNWEtOTcwZS00NDcwLTgxN2ItYmU4OTY0NjRkNWUzXzEwMA==/',
    );
  });

  it('defaults unknown filter params to inbox', () => {
    expect(messageFilterFromParam('nope')).toBe('inbox');
    expect(messageFilterFromParam('connections')).toBe('connections');
  });
});

function source(index: number, values: Record<string, string>): MessageSourceRow {
  return {
    row: row(index, values),
    datasetId: 'messages',
    datasetTitle: 'Messages',
  };
}

function row(index: number, values: Record<string, string>): DatasetRow {
  return { __row: index, ...values };
}
