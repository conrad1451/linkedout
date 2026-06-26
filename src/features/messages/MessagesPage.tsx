import { Paperclip, Search, SquarePen, ExternalLink } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent,
} from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useActiveImport } from '../../app/useImports';
import { EmptyState } from '../../components/EmptyState';
import { InitialsAvatar } from '../../components/InitialsAvatar';
import { OpenOnLinkedInLink } from '../../components/OpenOnLinkedInLink';
import { RelativeTimeText } from '../../components/RelativeTimeText';
import {
  filterMessageConversations,
  messageFilterFromParam,
  type MessageConversation,
  type MessageFilter,
  type MessageItem,
} from './model';
import { useMessagesData } from './useMessagesData';

const LINKEDIN_NEW_MESSAGE_URL = 'https://www.linkedin.com/messaging/thread/new/';

const FILTERS: Array<{ id: MessageFilter; label: string }> = [
  { id: 'inbox', label: 'All' },
  { id: 'connections', label: 'Connections' },
];

const INITIAL_CONVERSATION_LIMIT = 60;
const CONVERSATION_BATCH_SIZE = 60;
const INITIAL_MESSAGE_LIMIT = 80;
const MESSAGE_BATCH_SIZE = 80;
const SCROLL_LOAD_THRESHOLD_PX = 240;
const MESSAGES_ROUTE_BASE = '/category/messages';

export function MessagesPage() {
  const active = useActiveImport();
  const { data, loading, error } = useMessagesData(active);
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const activeFilter = messageFilterFromParam(searchParams.get('filter'));

  const conversations = useMemo(() => data?.conversations ?? [], [data?.conversations]);
  const conversationWindowKey = `${active?.id ?? ''}\u0000${activeFilter}\u0000${query}\u0000${conversations.length}`;
  const [conversationWindow, setConversationWindow] = useState({
    key: '',
    count: INITIAL_CONVERSATION_LIMIT,
  });
  const visibleConversationCount =
    conversationWindow.key === conversationWindowKey
      ? conversationWindow.count
      : INITIAL_CONVERSATION_LIMIT;
  const filteredConversations = useMemo(
    () => filterMessageConversations(conversations, activeFilter, query),
    [activeFilter, conversations, query],
  );
  const selectedConversation = useMemo(
    () => findSelectedConversation(filteredConversations, conversationId),
    [filteredConversations, conversationId],
  );
  const selectedRouteConversationId = selectedConversation
    ? routeConversationIdForConversation(selectedConversation)
    : null;
  const filterCounts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((filter) => [
          filter.id,
          filterMessageConversations(conversations, filter.id, query).length,
        ]),
      ) as Record<MessageFilter, number>,
    [conversations, query],
  );
  const availableFilters = useMemo(
    () =>
      FILTERS.filter(
        (filter) =>
          filter.id === 'inbox' ||
          filterMessageConversations(conversations, filter.id, '').length > 0,
      ),
    [conversations],
  );
  const visibleConversations = useMemo(
    () => filteredConversations.slice(0, visibleConversationCount),
    [filteredConversations, visibleConversationCount],
  );
  const hasMoreConversations = visibleConversationCount < filteredConversations.length;
  const search = searchParams.toString();
  const searchSuffix = search ? `?${search}` : '';

  useEffect(() => {
    if (!selectedConversation) {
      if (!conversationId) return;
      navigate({ pathname: MESSAGES_ROUTE_BASE, search: searchSuffix }, { replace: true });
      return;
    }
    if (selectedRouteConversationId === conversationId) return;
    navigate(
      {
        pathname: messagesPath(routeConversationIdForConversation(selectedConversation)),
        search: searchSuffix,
      },
      { replace: true },
    );
  }, [conversationId, navigate, searchSuffix, selectedConversation, selectedRouteConversationId]);

  const handleConversationListScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!hasMoreConversations) return;
      const element = event.currentTarget;
      const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
      if (remaining > SCROLL_LOAD_THRESHOLD_PX) return;
      setConversationWindow((current) => {
        const currentCount =
          current.key === conversationWindowKey ? current.count : INITIAL_CONVERSATION_LIMIT;
        return {
          key: conversationWindowKey,
          count: Math.min(filteredConversations.length, currentCount + CONVERSATION_BATCH_SIZE),
        };
      });
    },
    [conversationWindowKey, filteredConversations.length, hasMoreConversations],
  );

  if (!active) {
    return (
      <EmptyState
        title="No active import"
        description="Import a LinkedIn export ZIP before browsing messages."
        action={
          <Link to="/imports" className="btn btn-primary">
            Import data
          </Link>
        }
      />
    );
  }

  if (loading) return <div className="loading loading-spinner" aria-label="Loading messages" />;
  if (error) {
    return (
      <div role="alert" className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }
  if (!data || conversations.length === 0) {
    return (
      <EmptyState
        title="No messages found"
        description="The active import does not include exported LinkedIn messages."
      />
    );
  }

  return (
    <div className="grid h-[calc(100vh-9rem)] min-h-120 overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm md:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="flex min-h-0 min-w-0 flex-col border-b border-base-300 md:border-r md:border-b-0">
        <div className="space-y-3 border-b border-base-300 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold">Messaging</h1>
              <p className="text-sm opacity-70">
                {conversations.length.toLocaleString()} conversations ·{' '}
                {data.totalRows.toLocaleString()} messages
              </p>
            </div>
            <a
              href={LINKEDIN_NEW_MESSAGE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-ghost btn-sm btn-square"
              aria-label="New LinkedIn message"
              title="New LinkedIn message"
            >
              <SquarePen className="h-4 w-4" />
            </a>
          </div>
          <label className="input input-bordered input-sm flex w-full items-center gap-2 bg-base-200">
            <Search className="h-4 w-4 opacity-60" />
            <input
              type="search"
              className="grow"
              placeholder="Search messages"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div
            role="tablist"
            aria-label="Message filters"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {availableFilters.map((filter) => (
              <MessageFilterButton
                key={filter.id}
                label={filter.label}
                count={filterCounts[filter.id]}
                active={activeFilter === filter.id}
                onClick={() => {
                  const nextParams = new URLSearchParams(searchParams);
                  if (filter.id === 'inbox') nextParams.delete('filter');
                  else nextParams.set('filter', filter.id);
                  setSearchParams(nextParams);
                }}
              />
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto" onScroll={handleConversationListScroll}>
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-sm opacity-70">No conversations found.</div>
          ) : (
            <ul className="divide-y divide-base-300">
              {visibleConversations.map((conversation) => (
                <li key={conversation.id}>
                  <ConversationListItem
                    conversation={conversation}
                    active={conversation.id === selectedConversation?.id}
                    onSelect={() =>
                      navigate(
                        {
                          pathname: messagesPath(conversation.id),
                          search: searchSuffix,
                        },
                        { replace: false },
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {selectedConversation ? (
        <ConversationPane key={selectedConversation.id} conversation={selectedConversation} />
      ) : (
        <div className="flex min-h-0 items-center justify-center p-6">
          <EmptyState title="No conversation selected" />
        </div>
      )}
    </div>
  );
}

function findSelectedConversation(
  conversations: MessageConversation[],
  routeConversationId: string | undefined,
): MessageConversation | null {
  if (conversations.length === 0) return null;
  if (!routeConversationId) return conversations[0] ?? null;
  return (
    conversations.find(
      (conversation) =>
        conversation.id === routeConversationId ||
        conversation.messages.some((message) => message.id === routeConversationId),
    ) ??
    conversations[0] ??
    null
  );
}

function routeConversationIdForConversation(conversation: MessageConversation): string {
  return conversation.id;
}

function messagesPath(conversationId: string): string {
  return `${MESSAGES_ROUTE_BASE}/${encodeURIComponent(conversationId)}`;
}

function MessageFilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={messageFilterClass(active)}
      onClick={onClick}
      title={`${label}: ${count.toLocaleString()} conversations`}
    >
      {label}
    </button>
  );
}

function ConversationListItem({
  conversation,
  active,
  onSelect,
}: {
  conversation: MessageConversation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={conversationListItemClass(active)}
      onClick={onSelect}
      aria-pressed={active}
    >
      <InitialsAvatar name={conversation.title} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-bold">{conversation.title}</span>
            <span
              className="badge badge-neutral badge-sm shrink-0 font-bold"
              title={`${conversation.messages.length.toLocaleString()} messages`}
            >
              {formatBadgeCount(conversation.messages.length)}
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold opacity-70">
            <RelativeTimeText value={conversation.latestEpochMs} />
          </span>
        </span>
        <span className="mt-0.5 block truncate text-sm opacity-70">{conversation.preview}</span>
        {conversation.latestMessage.attachments.length > 0 && (
          <span className="mt-1 flex items-center gap-2 text-xs opacity-60">
            <Paperclip className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
    </button>
  );
}

function ConversationPane({ conversation }: { conversation: MessageConversation }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const preserveScrollRef = useRef<{ height: number; top: number } | null>(null);
  const [visibleMessageCount, setVisibleMessageCount] = useState(() =>
    initialVisibleMessageCount(conversation.messages.length),
  );
  const visibleMessages = useMemo(
    () =>
      conversation.messages.slice(Math.max(0, conversation.messages.length - visibleMessageCount)),
    [conversation.messages, visibleMessageCount],
  );
  const hasOlderMessages = visibleMessageCount < conversation.messages.length;
  const loadOlderMessages = useCallback(() => {
    const element = scrollRef.current;
    preserveScrollRef.current = element
      ? { height: element.scrollHeight, top: element.scrollTop }
      : null;
    setVisibleMessageCount((count) =>
      Math.min(conversation.messages.length, count + MESSAGE_BATCH_SIZE),
    );
  }, [conversation.messages.length]);
  const handleMessageScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!hasOlderMessages || event.currentTarget.scrollTop > SCROLL_LOAD_THRESHOLD_PX) return;
      loadOlderMessages();
    },
    [hasOlderMessages, loadOlderMessages],
  );

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    const preserved = preserveScrollRef.current;
    const element = scrollRef.current;
    if (!preserved || !element) return;
    element.scrollTop = element.scrollHeight - preserved.height + preserved.top;
    preserveScrollRef.current = null;
  }, [visibleMessageCount]);

  return (
    <section className="flex min-h-0 min-w-0 flex-col bg-base-100">
      <header className="flex flex-wrap items-center gap-3 border-b border-base-300 p-4">
        <InitialsAvatar name={conversation.title} size="sm" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{conversation.title}</h2>
          <p className="truncate text-sm opacity-70">
            {conversation.subtitle} · {conversation.sourceTitles.join(', ')}
          </p>
        </div>
        {conversation.linkedInThreadUrl && (
          <OpenOnLinkedInLink
            href={conversation.linkedInThreadUrl}
            format="long"
            size="sm"
            label="Open conversation on LinkedIn"
            className="shrink-0"
          />
        )}
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-base-200/60 p-3 sm:p-5"
        onScroll={handleMessageScroll}
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {visibleMessages.map((message, index) => {
            const previousMessage = index > 0 ? visibleMessages[index - 1] : undefined;
            const showDivider = shouldShowDateDivider(message, previousMessage);
            return (
              <div key={message.id} className="space-y-4">
                {showDivider && <DateDivider message={message} />}
                <MessageBubble message={message} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function initialVisibleMessageCount(totalMessages: number): number {
  return Math.min(totalMessages, INITIAL_MESSAGE_LIMIT);
}

function DateDivider({ message }: { message: MessageItem }) {
  return (
    <div className="flex justify-center">
      <span className="rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs font-semibold opacity-80">
        {formatDateDivider(message.epochMs, message.date)}
      </span>
    </div>
  );
}

function MessageBubble({ message }: { message: MessageItem }) {
  const self = message.isSelf;
  return (
    <div className={`flex gap-2 ${self ? 'justify-end' : 'justify-start'}`}>
      {!self && <InitialsAvatar name={message.sender.name} size="xs" className="mt-5" />}
      <div className={`flex max-w-[min(42rem,88%)] flex-col ${self ? 'items-end' : 'items-start'}`}>
        <div className="mb-1 flex max-w-full items-center gap-2 text-xs opacity-70">
          <MessageSenderLabel sender={message.sender} label={self ? 'You' : message.sender.name} />
          <span className="shrink-0">{formatMessageTime(message.epochMs, message.date)}</span>
        </div>
        <div className={messageBubbleClass(self)}>
          {message.subject && <div className="mb-2 font-bold">{message.subject}</div>}
          {message.content ? (
            <p className="whitespace-pre-wrap wrap-break-word leading-relaxed">{message.content}</p>
          ) : (
            <p className="opacity-70">Attachment</p>
          )}
          {message.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.attachments.map((attachment, index) => (
                <a
                  key={attachment}
                  href={attachment}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="badge badge-outline gap-1 py-3"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Attachment {index + 1}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      {self && (
        <InitialsAvatar
          name={message.sender.name}
          size="xs"
          className="mt-5 bg-primary text-primary-content"
        />
      )}
    </div>
  );
}

function MessageSenderLabel({ sender, label }: { sender: MessageItem['sender']; label: string }) {
  if (!sender.profileUrl) return <span className="truncate font-bold">{label}</span>;

  return (
    <a
      href={sender.profileUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="truncate font-bold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={`Open ${sender.name}'s LinkedIn profile`}
      title={sender.profileUrl}
    >
      {label}
    </a>
  );
}

function messageFilterClass(active: boolean): string {
  const base = 'btn btn-sm min-h-8 shrink-0 rounded-full px-3 font-semibold normal-case';
  if (active) return `${base} btn-primary border-primary gap-1`;
  return `${base} btn-outline border-base-content/50 text-base-content hover:border-primary hover:bg-primary/10 hover:text-primary`;
}

function conversationListItemClass(active: boolean): string {
  const base =
    'flex w-full gap-3 border-l-4 p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary';
  if (active) return `${base} border-primary bg-primary/10`;
  return `${base} border-transparent hover:bg-base-200`;
}

function messageBubbleClass(self: boolean): string {
  const base = 'rounded-box border px-4 py-3 text-sm shadow-sm';
  if (self) return `${base} border-primary/30 bg-primary/10`;
  return `${base} border-base-300 bg-base-100`;
}

function shouldShowDateDivider(
  message: MessageItem,
  previousMessage: MessageItem | undefined,
): boolean {
  if (!Number.isFinite(message.epochMs)) return false;
  if (!previousMessage || !Number.isFinite(previousMessage.epochMs)) return true;
  return (
    new Date(message.epochMs).toDateString() !== new Date(previousMessage.epochMs).toDateString()
  );
}

function formatDateDivider(epochMs: number, fallback: string): string {
  if (!Number.isFinite(epochMs)) return fallback;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(epochMs));
}

function formatMessageTime(epochMs: number, fallback: string): string {
  if (!Number.isFinite(epochMs)) return fallback;
  return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(epochMs));
}

function formatBadgeCount(count: number): string {
  if (count < 1000) return count.toLocaleString();
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 0 }).format(
    count,
  );
}
