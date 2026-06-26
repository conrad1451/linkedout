import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagesPage } from './MessagesPage';

const mockUseActiveImport = vi.fn();
const mockUseMessagesData = vi.fn();

const FIRST_CONVERSATION_ID = '2-MTM1ZDVlNWEtOTcwZS00NDcwLTgxN2ItYmU4OTY0NjRkNWUzXzEwMA==';
const SECOND_CONVERSATION_ID = '2-YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpfMTAx';

vi.mock('../../app/useImports', () => ({
  useActiveImport: () => mockUseActiveImport(),
}));

vi.mock('./useMessagesData', () => ({
  useMessagesData: (...args: unknown[]) => mockUseMessagesData(...args),
}));

describe('MessagesPage', () => {
  const firstMessage = {
    id: 'messages-1:0',
    datasetId: 'messages-1',
    datasetTitle: 'Messages',
    rowIndex: 0,
    conversationId: FIRST_CONVERSATION_ID,
    sender: {
      name: 'Grace Hopper',
      profileUrl: 'https://www.linkedin.com/in/grace-hopper/',
      isSelf: false,
    },
    recipients: [{ name: 'Ada Lovelace', isSelf: true }],
    date: '2026-05-28 09:00:00',
    epochMs: new Date('2026-05-28T09:00:00Z').getTime(),
    subject: 'Files',
    content: 'See attachment',
    folder: 'Inbox',
    attachments: ['https://example.com/file.pdf'],
    isSelf: false,
  };

  const secondMessage = {
    id: 'messages-1:1',
    datasetId: 'messages-1',
    datasetTitle: 'Messages',
    rowIndex: 1,
    conversationId: SECOND_CONVERSATION_ID,
    sender: {
      name: 'Katherine Johnson',
      profileUrl: 'https://www.linkedin.com/in/katherine-johnson/',
      isSelf: false,
    },
    recipients: [{ name: 'Ada Lovelace', isSelf: true }],
    date: '2026-05-29 10:00:00',
    epochMs: new Date('2026-05-29T10:00:00Z').getTime(),
    subject: 'Follow-up',
    content: 'Checking in',
    folder: 'Inbox',
    attachments: [],
    isSelf: false,
  };

  beforeEach(() => {
    mockUseActiveImport.mockReset();
    mockUseMessagesData.mockReset();

    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 1,
      totalRows: 2,
      datasets: [],
    });
    mockUseMessagesData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        conversations: [
          {
            id: FIRST_CONVERSATION_ID,
            linkedInThreadUrl: `https://www.linkedin.com/messaging/thread/${FIRST_CONVERSATION_ID}/`,
            title: 'Grace Hopper',
            subtitle: '1 person · 1 message',
            participants: [
              {
                name: 'Grace Hopper',
                profileUrl: 'https://www.linkedin.com/in/grace-hopper/',
                isSelf: false,
              },
              { name: 'Ada Lovelace', isSelf: true },
            ],
            otherParticipants: [
              {
                name: 'Grace Hopper',
                profileUrl: 'https://www.linkedin.com/in/grace-hopper/',
                isSelf: false,
              },
            ],
            messages: [firstMessage],
            latestMessage: firstMessage,
            latestEpochMs: firstMessage.epochMs,
            preview: firstMessage.content,
            folders: ['Inbox'],
            sourceTitles: ['Messages'],
            searchText: 'grace hopper see attachment',
            isConnection: true,
          },
          {
            id: SECOND_CONVERSATION_ID,
            linkedInThreadUrl: `https://www.linkedin.com/messaging/thread/${SECOND_CONVERSATION_ID}/`,
            title: 'Katherine Johnson',
            subtitle: '1 person · 1 message',
            participants: [
              {
                name: 'Katherine Johnson',
                profileUrl: 'https://www.linkedin.com/in/katherine-johnson/',
                isSelf: false,
              },
              { name: 'Ada Lovelace', isSelf: true },
            ],
            otherParticipants: [
              {
                name: 'Katherine Johnson',
                profileUrl: 'https://www.linkedin.com/in/katherine-johnson/',
                isSelf: false,
              },
            ],
            messages: [secondMessage],
            latestMessage: secondMessage,
            latestEpochMs: secondMessage.epochMs,
            preview: secondMessage.content,
            folders: ['Inbox'],
            sourceTitles: ['Messages'],
            searchText: 'katherine johnson checking in',
            isConnection: true,
          },
        ],
        messageDatasets: [],
        primaryDatasetId: 'messages-1',
        ownerName: 'Ada Lovelace',
        totalRows: 2,
      },
    });
  });

  it('renders the matching conversation when opened with a conversation id route param', () => {
    renderMessagesPage(messagesPath(FIRST_CONVERSATION_ID));

    expect(screen.getByRole('link', { name: /attachment 1/i })).toHaveAttribute(
      'href',
      'https://example.com/file.pdf',
    );
  });

  it('writes the opened conversation id into the route when loading without one', async () => {
    renderMessagesPage('/category/messages');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(messagesPath(FIRST_CONVERSATION_ID));
    });
  });

  it('updates the route when selecting a different conversation', async () => {
    const user = userEvent.setup();

    renderMessagesPage(messagesPath(FIRST_CONVERSATION_ID));

    await user.click(screen.getByRole('button', { name: /Katherine Johnson/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        messagesPath(SECOND_CONVERSATION_ID),
      );
    });
  });

  it('normalizes legacy message id routes to the canonical conversation id', async () => {
    renderMessagesPage(messagesPath(firstMessage.id));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(messagesPath(FIRST_CONVERSATION_ID));
    });
  });

  it('shows relative conversation timestamps with absolute timestamps in a tooltip', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T12:00:00Z'));

    try {
      renderMessagesPage('/category/messages');

      const conversationButton = screen.getByRole('button', { name: /Grace Hopper/i });
      const time = conversationButton.querySelector('time');

      expect(time).not.toBeNull();
      expect(time).toHaveAttribute('dateTime', new Date(firstMessage.epochMs).toISOString());
      expect(time).toHaveAttribute(
        'title',
        new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'medium',
        }).format(new Date(firstMessage.epochMs)),
      );

      const previousAbsoluteLabel = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(new Date(firstMessage.epochMs));

      expect(time?.textContent).not.toBe(previousAbsoluteLabel);
    } finally {
      vi.useRealTimers();
    }
  });
});

function renderMessagesPage(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/category/messages/:conversationId?" element={<MessagesRouteHarness />} />
      </Routes>
    </MemoryRouter>,
  );
}

function MessagesRouteHarness() {
  const location = useLocation();

  return (
    <>
      <MessagesPage />
      <div data-testid="location">{`${location.pathname}${location.search}`}</div>
    </>
  );
}

function messagesPath(id: string): string {
  return `/category/messages/${encodeURIComponent(id)}`;
}
