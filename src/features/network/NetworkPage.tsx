import {
  ArrowRight,
  Building2,
  CalendarDays,
  Grape,
  Hash,
  Newspaper,
  Quote,
  ArrowLeftToLine,
  ArrowRightFromLine,
  UserRoundCheck,
  UserRoundPlus,
  Users,
  SquareStack,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { OpenRawTableLink } from '../../components/OpenRawTableLink';
import { useActiveImport } from '../../app/useImports';
import { EmptyState } from '../../components/EmptyState';
import { OpenOnLinkedInLink } from '../../components/OpenOnLinkedInLink';
import { PersonRow } from '../../components/PersonRow';
import { CompanyRow } from '../../components/CompanyRow';
import { EventRow } from '../../components/EventRow';
import { InvitationRow } from '../../components/InvitationRow';
import { Pagination } from '../../components/Pagination';
import { RecommendationRow } from '../../components/RecommendationRow';
import { EndorsementRow } from '../../components/EndorsementRow';
import { formatTemporal, parseTemporalValue } from '../../lib/datetime';
import { linkedInProfileSectionUrl, type LinkedInProfileInfo } from '../../lib/linkedin/profile';
import { HashtagRow } from '../../components/HashtagRow';
import { displayText, text } from '../profile/model';
import { useDataset } from '../../hooks/useDataset';
import type { DatasetMeta, DatasetRow } from '../../lib/store';

const PAGE_SIZE = 25;
const INVITATION_PREVIEW_LIMIT = 3;

type NetworkView =
  | 'overview'
  | 'connections'
  | 'hashtags'
  | 'following'
  | 'followers'
  | 'groups'
  | 'pages'
  | 'events'
  | 'newsletters'
  | 'recommendations-received'
  | 'recommendations-given'
  | 'endorsements-received'
  | 'endorsements-given'
  | 'invitations-received'
  | 'invitations-sent'
  | 'invitations';

type NetworkDatasetLookup = {
  connections: DatasetMeta | undefined;
  invitations: DatasetMeta | undefined;
  following: DatasetMeta | undefined;
  pages: DatasetMeta | undefined;
  hashtags: DatasetMeta | undefined;
  events: DatasetMeta | undefined;
  recommendationsReceived: DatasetMeta | undefined;
  recommendationsGiven: DatasetMeta | undefined;
  endorsementsReceived: DatasetMeta | undefined;
  endorsementsGiven: DatasetMeta | undefined;
};

export function NetworkPage() {
  const active = useActiveImport();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = networkViewFromParam(searchParams.get('view'));
  const [page, setPage] = useState(0);

  const datasets: NetworkDatasetLookup = {
    connections: active?.datasets.find((dataset) => dataset.schemaId === 'connections'),
    invitations: active?.datasets.find((dataset) => dataset.schemaId === 'invitations'),
    following: active?.datasets.find((dataset) => dataset.schemaId === 'member-follows'),
    pages: active?.datasets.find((dataset) => dataset.schemaId === 'company-follows'),
    hashtags: active?.datasets.find((dataset) => dataset.schemaId === 'hashtag-follows'),
    events: active?.datasets.find((dataset) => dataset.schemaId === 'events'),
    recommendationsReceived: active?.datasets.find(
      (dataset) => dataset.schemaId === 'recommendations-received',
    ),
    recommendationsGiven: active?.datasets.find(
      (dataset) => dataset.schemaId === 'recommendations-given',
    ),
    endorsementsReceived: active?.datasets.find(
      (dataset) => dataset.schemaId === 'endorsements-received',
    ),
    endorsementsGiven: active?.datasets.find(
      (dataset) => dataset.schemaId === 'endorsements-given',
    ),
  };

  const connectionsDataset = datasets.connections;
  const invitationsDataset = datasets.invitations;
  const connectionsCount = connectionsDataset?.rowCount ?? 0;
  const detailDataset = detailDatasetForView(activeView, datasets);
  const linkedInHref = viewLinkedInHref(activeView, active?.linkedInProfile);

  const { rows, total, loading, error } = useDataset(
    active?.id ?? null,
    detailDataset?.datasetId ?? null,
    {
      offset: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      search: invitationDirectionToken(activeView),
      dateRange: undefined,
      dateField: detailDataset?.dateField,
      sort: 'date-desc',
    },
  );

  const receivedInvitations = useDataset(
    active?.id ?? null,
    invitationsDataset?.datasetId ?? null,
    {
      limit: 0,
      search: 'incoming',
    },
  );
  const sentInvitations = useDataset(active?.id ?? null, invitationsDataset?.datasetId ?? null, {
    limit: 0,
    search: 'outgoing',
  });

  const invitationPreview = useDataset(
    activeView === 'overview' ? (active?.id ?? null) : null,
    activeView === 'overview' ? (invitationsDataset?.datasetId ?? null) : null,
    {
      offset: 0,
      limit: INVITATION_PREVIEW_LIMIT,
      dateField: invitationsDataset?.dateField,
      sort: 'date-desc',
    },
  );

  function setView(nextView: NetworkView) {
    setPage(0);

    const next = new URLSearchParams(searchParams);
    if (nextView === 'overview') next.delete('view');
    else next.set('view', nextView);
    setSearchParams(next);
  }

  if (!active) {
    return (
      <EmptyState
        title="No active import"
        description="Import a LinkedIn export ZIP before browsing your network."
        action={
          <Link to="/imports" className="btn btn-primary">
            Import data
          </Link>
        }
      />
    );
  }

  if (!connectionsDataset) {
    return (
      <EmptyState
        title="No connections dataset found"
        description="This import does not include Connections.csv."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[18rem_minmax(0,1fr)] md:items-start">
        <NetworkRail
          activeView={activeView}
          counts={{
            connections: connectionsCount,
            following: datasets.following?.rowCount ?? 0,
            followers: 0,
            groups: 0,
            events: datasets.events?.rowCount ?? 0,
            pages: datasets.pages?.rowCount ?? 0,
            hashtags: datasets.hashtags?.rowCount ?? 0,
            newsletters: 0,
            'recommendations-received': datasets.recommendationsReceived?.rowCount ?? 0,
            'recommendations-given': datasets.recommendationsGiven?.rowCount ?? 0,
            'endorsements-received': datasets.endorsementsReceived?.rowCount ?? 0,
            'endorsements-given': datasets.endorsementsGiven?.rowCount ?? 0,
            'invitations-received': receivedInvitations.total,
            'invitations-sent': sentInvitations.total,
          }}
          onSelect={setView}
        />

        <main className="space-y-4">
          {activeView === 'overview' ? (
            <NetworkOverview
              invitationsDataset={invitationsDataset}
              rows={invitationPreview.rows}
              loading={invitationPreview.loading}
              error={invitationPreview.error}
              onShowAll={() => setView('invitations')}
            />
          ) : activeView === 'followers' ? (
            <UnavailableNetworkSection
              title="Followers"
              description="This LinkedIn export does not include a dedicated followers dataset, so there is nothing reliable to render here yet."
              linkedInHref={linkedInHref}
            />
          ) : activeView === 'groups' ? (
            <UnavailableNetworkSection
              title="Groups"
              description="LinkedIn does not include group membership in the export. You can view your groups on LinkedIn."
              linkedInHref={linkedInHref}
            />
          ) : activeView === 'newsletters' ? (
            <UnavailableNetworkSection
              title="Newsletters"
              description="No newsletter subscription export was found in this dataset. If LinkedIn adds one to the export, this section can be wired to it directly."
              linkedInHref={linkedInHref}
            />
          ) : !detailDataset ? (
            <UnavailableNetworkSection
              title={viewTitle(activeView)}
              description="This dataset is not present in the active import."
              linkedInHref={linkedInHref}
            />
          ) : (
            <DatasetDetailSection
              title={viewTitle(activeView)}
              subtitle={viewSubtitle(activeView, detailDataset)}
              linkedInHref={linkedInHref}
              dataset={detailDataset}
              rows={rows}
              total={total}
              loading={loading}
              error={error}
              page={page}
              onPageChange={setPage}
              emptyTitle={emptyTitle(activeView)}
              emptyDescription={emptyDescription(activeView)}
              renderRow={(row) => renderViewRow(activeView, row)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function NetworkRail({
  activeView,
  counts,
  onSelect,
}: {
  activeView: NetworkView;
  counts: Record<Exclude<NetworkView, 'overview' | 'invitations'>, number>;
  onSelect: (view: NetworkView) => void;
}) {
  type RailItem = {
    view: Exclude<NetworkView, 'overview' | 'invitations'>;
    label: string;
    menuLabel?: string;
    Icon: LucideIcon;
  };

  const connectionsItem: RailItem = {
    view: 'connections',
    label: 'Connections',
    Icon: Users,
  };
  const eventsItem: RailItem = {
    view: 'events',
    label: 'Events',
    Icon: CalendarDays,
  };
  const groups: Array<{ title: string; items: RailItem[] }> = [
    {
      title: 'Follows',
      items: [
        {
          view: 'following',
          label: 'Following',
          Icon: UserRoundPlus,
        },
        {
          view: 'followers',
          label: 'Followers',
          Icon: UserRoundCheck,
        },
        {
          view: 'groups',
          label: 'Groups',
          Icon: SquareStack,
        },
        {
          view: 'pages',
          label: 'Pages',
          Icon: Building2,
        },
        {
          view: 'hashtags',
          label: 'Hashtag',
          Icon: Hash,
        },
        {
          view: 'newsletters',
          label: 'Newsletters',
          Icon: Newspaper,
        },
      ],
    },
    {
      title: 'Recommendations',
      items: [
        {
          view: 'recommendations-given',
          label: 'Recommendations given',
          menuLabel: 'Given',
          Icon: Quote,
        },
        {
          view: 'recommendations-received',
          label: 'Recommendations received',
          menuLabel: 'Received',
          Icon: Quote,
        },
      ],
    },
    {
      title: 'Endorsements',
      items: [
        {
          view: 'endorsements-given',
          label: 'Endorsements given',
          menuLabel: 'Given',
          Icon: Grape,
        },
        {
          view: 'endorsements-received',
          label: 'Endorsements received',
          menuLabel: 'Received',
          Icon: Grape,
        },
      ],
    },
    {
      title: 'Pending Invitation',
      items: [
        {
          view: 'invitations-sent',
          label: 'Invitations sent',
          menuLabel: 'Sent',
          Icon: ArrowRightFromLine,
        },
        {
          view: 'invitations-received',
          label: 'Invitations received',
          menuLabel: 'Received',
          Icon: ArrowLeftToLine,
        },
      ],
    },
  ];

  const renderRailItem = ({ view, label, menuLabel, Icon }: RailItem) => (
    <li key={view}>
      <button
        type="button"
        className={activeView === view ? 'menu-active' : ''}
        onClick={() => onSelect(view)}
        aria-pressed={activeView === view}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-70" />
        {menuLabel ? (
          <>
            <span className="sr-only">{label}</span>
            <span aria-hidden="true" className="truncate">
              {menuLabel}
            </span>
          </>
        ) : (
          <span className="truncate">{label}</span>
        )}
        {counts[view] > 0 ? (
          <span className="badge badge-ghost badge-sm ml-auto tabular-nums">
            {counts[view].toLocaleString()}
          </span>
        ) : null}
      </button>
    </li>
  );

  return (
    <aside className="space-y-4 md:sticky md:top-20">
      <section className="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
        <header className="border-b border-base-300 px-4 py-4">
          <h2 className="text-xl font-bold tracking-tight">Manage my network</h2>
        </header>
        <nav aria-label="My Network sections" className="p-2">
          <ul className="menu w-full p-0">
            {renderRailItem(connectionsItem)}
            {groups.map((group) => (
              <li key={group.title}>
                <div className="menu-title">{group.title}</div>
                <ul>{group.items.map(renderRailItem)}</ul>
              </li>
            ))}
            {renderRailItem(eventsItem)}
          </ul>
        </nav>
      </section>

      <section className="rounded-box border border-base-300 bg-base-100 p-4 text-sm leading-6 opacity-75 shadow-sm">
        Followers and newsletter subscriptions are not present in the current export, so those
        sections stay intentionally empty for now.
      </section>
    </aside>
  );
}

function NetworkOverview({
  invitationsDataset,
  rows,
  loading,
  error,
  onShowAll,
}: {
  invitationsDataset: DatasetMeta | undefined;
  rows: DatasetRow[];
  loading: boolean;
  error: string | null;
  onShowAll: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-2xl font-bold">
            Invitations ({(invitationsDataset?.rowCount ?? 0).toLocaleString()})
          </h2>
          <p className="text-sm opacity-70">
            The latest connection invites from your imported LinkedIn export.
          </p>
        </div>
        {invitationsDataset && invitationsDataset.rowCount > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            aria-label="Show all invitations"
            onClick={onShowAll}
          >
            Show all <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {error ? (
        <div role="alert" className="m-4 alert alert-error">
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="flex justify-center px-4 py-12">
          <div className="loading loading-spinner" aria-label="Loading invitations" />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-12 sm:px-5">
          <EmptyState
            title="No invitations in this export"
            description="Invitations.csv is either missing or empty for the active import."
          />
        </div>
      ) : (
        <div className="divide-y divide-base-300">
          {rows.map((row) => (
            <InvitationCard key={row.__row} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}

function DatasetDetailSection({
  title,
  subtitle,
  linkedInHref,
  dataset,
  rows,
  total,
  loading,
  error,
  page,
  onPageChange,
  emptyTitle,
  emptyDescription,
  renderRow,
}: {
  title: string;
  subtitle: string;
  linkedInHref?: string;
  dataset: DatasetMeta;
  rows: DatasetRow[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  onPageChange: (page: number) => void;
  emptyTitle: string;
  emptyDescription: string;
  renderRow: (row: DatasetRow) => ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 px-4 py-4 sm:px-5 sm:py-5">
        <div>
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-sm opacity-70">
              {total.toLocaleString()} result(s) · {subtitle}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 lg:justify-end">
          {linkedInHref && (
            <OpenOnLinkedInLink
              href={linkedInHref}
              format="long"
              size="sm"
              label={`Open ${title} on LinkedIn`}
            />
          )}
          <OpenRawTableLink to={`/raw/${dataset.datasetId}`} size="sm" />
        </div>
      </div>

      {error ? (
        <div role="alert" className="m-4 alert alert-error">
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="flex justify-center px-4 py-12">
          <div className="loading loading-spinner" aria-label={`Loading ${title.toLowerCase()}`} />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-12 sm:px-5">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        <>
          <div className="divide-y divide-base-300">{rows.map((row) => renderRow(row))}</div>
          <div className="border-t border-base-300 px-4 py-4 sm:px-5">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={onPageChange}
            />
          </div>
        </>
      )}
    </section>
  );
}

function UnavailableNetworkSection({
  title,
  description,
  linkedInHref,
}: {
  title: string;
  description: string;
  linkedInHref?: string;
}) {
  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 opacity-75">{description}</p>
        </div>
        {linkedInHref ? (
          <OpenOnLinkedInLink
            href={linkedInHref}
            format="long"
            size="sm"
            label={`Open ${title} on LinkedIn`}
          />
        ) : null}
      </div>
    </section>
  );
}

function ConnectionCard({ row }: { row: DatasetRow }) {
  const name = fullName(row);
  const profileUrl = cell(row, 'URL');
  const position = cell(row, 'Position');
  const company = cell(row, 'Company');
  const connectedOnTemporal = temporalFromRow(row, 'Connected On');

  return (
    <PersonRow
      name={name}
      href={profileUrl}
      primaryLine={position}
      secondaryLine={company}
      timePrefix="Connected"
      dateTemporal={connectedOnTemporal}
      date={text(row, 'Connected On')}
      showSearch={false}
    />
  );
}

function InvitationCard({ row }: { row: DatasetRow }) {
  const name = invitationName(row);
  const profileUrl = invitationProfileUrl(row);
  const direction = invitationDirection(row);
  const sentAtTemporal = temporalFromRow(row, 'Sent At');
  const message = cell(row, 'Message');

  return (
    <InvitationRow
      name={name}
      href={profileUrl}
      message={message}
      dateTemporal={sentAtTemporal}
      date={text(row, 'Sent At')}
      direction={direction}
    />
  );
}

function FollowingCard({ row }: { row: DatasetRow }) {
  const name = cell(row, 'FullName') || 'LinkedIn member';
  const followedOnTemporal = temporalFromRow(row, 'Date');

  return (
    <PersonRow
      name={name}
      timePrefix="Followed"
      dateTemporal={followedOnTemporal}
      date={text(row, 'Date')}
      showSearch
    />
  );
}

function PageCard({ row }: { row: DatasetRow }) {
  const organization = cell(row, 'Organization') || 'LinkedIn page';
  const followedOnTemporal = temporalFromRow(row, 'Followed On');

  return (
    <CompanyRow
      name={organization}
      timePrefix="Followed"
      dateTemporal={followedOnTemporal}
      date={text(row, 'Followed On')}
      showSearch
    />
  );
}

function HashtagCard({ row }: { row: DatasetRow }) {
  const tag = cell(row, 'HashTag') || '';
  const followedOnTemporal = temporalFromRow(row, 'CreatedTime');
  return <HashtagRow tag={tag} dateTemporal={followedOnTemporal} date={cell(row, 'CreatedTime')} />;
}

function EventCard({ row }: { row: DatasetRow }) {
  const eventName = cell(row, 'Event Name') || 'LinkedIn event';
  const eventTime = cell(row, 'Event Time');
  const eventTimeTemporal = temporalFromRow(row, 'Event Time');
  const status = cell(row, 'Status');
  const statusSummary = eventStatusSummary(status);

  return (
    <EventRow
      eventName={eventName}
      statusSummary={statusSummary}
      timePrefix={isFutureTemporal(eventTimeTemporal) ? 'Starts' : 'Started'}
      dateTemporal={eventTimeTemporal}
      date={eventTime}
    />
  );
}

function detailDatasetForView(
  view: NetworkView,
  datasets: NetworkDatasetLookup,
): DatasetMeta | undefined {
  if (view === 'connections') return datasets.connections;
  if (view === 'following') return datasets.following;
  if (view === 'hashtags') return datasets.hashtags;
  if (view === 'pages') return datasets.pages;
  if (view === 'events') return datasets.events;
  if (view === 'recommendations-received') return datasets.recommendationsReceived;
  if (view === 'recommendations-given') return datasets.recommendationsGiven;
  if (view === 'endorsements-received') return datasets.endorsementsReceived;
  if (view === 'endorsements-given') return datasets.endorsementsGiven;
  if (view === 'invitations-received') return datasets.invitations;
  if (view === 'invitations-sent') return datasets.invitations;
  if (view === 'invitations') return datasets.invitations;
  return undefined;
}

function renderViewRow(view: NetworkView, row: DatasetRow): ReactNode {
  if (view === 'connections') return <ConnectionCard key={row.__row} row={row} />;
  if (view === 'following') return <FollowingCard key={row.__row} row={row} />;
  if (view === 'hashtags') return <HashtagCard key={row.__row} row={row} />;
  if (view === 'pages') return <PageCard key={row.__row} row={row} />;
  if (view === 'events') return <EventCard key={row.__row} row={row} />;
  if (view === 'recommendations-received' || view === 'recommendations-given') {
    const name = [cell(row, 'First Name'), cell(row, 'Last Name')].filter(Boolean).join(' ');
    const headline = [cell(row, 'Job Title'), cell(row, 'Company')].filter(Boolean).join(' · ');
    const recommendationText = displayText(cell(row, 'Text'));
    const creationDate = cell(row, 'Creation Date');
    const creationTemporal = temporalFromRow(row, 'Creation Date');
    const status = cell(row, 'Status');

    return (
      <RecommendationRow
        key={row.__row}
        name={name}
        headline={headline}
        recommendationText={recommendationText}
        statusLabel={status ? titleCase(status) : undefined}
        createdAtValue={creationTemporal?.epochMs ?? creationDate ?? undefined}
        createdAtTitle={creationDate ? formatTemporal(creationTemporal, creationDate) : undefined}
        variant="network"
      />
    );
  }
  if (view === 'endorsements-received' || view === 'endorsements-given') {
    const isGiven = view === 'endorsements-given';
    const name = [
      cell(row, isGiven ? 'Endorsee First Name' : 'Endorser First Name'),
      cell(row, isGiven ? 'Endorsee Last Name' : 'Endorser Last Name'),
    ]
      .filter(Boolean)
      .join(' ');
    const profileUrl = cell(row, isGiven ? 'Endorsee Public Url' : 'Endorser Public Url');
    const href = profileUrl
      ? /^https?:\/\//i.test(profileUrl)
        ? profileUrl
        : `https://${profileUrl}`
      : undefined;
    const skillName = cell(row, 'Skill Name');
    const status = cell(row, 'Endorsement Status');
    const dateRaw = cell(row, 'Endorsement Date');
    const dateTemporal = temporalFromRow(row, 'Endorsement Date');

    return (
      <EndorsementRow
        key={row.__row}
        name={name}
        href={href}
        skillName={skillName}
        statusLabel={status ? titleCase(status) : undefined}
        createdAtValue={dateTemporal?.epochMs ?? dateRaw ?? undefined}
        createdAtTitle={dateRaw ? formatTemporal(dateTemporal, dateRaw) : undefined}
        variant="network"
      />
    );
  }
  if (view === 'invitations' || view === 'invitations-received' || view === 'invitations-sent')
    return <InvitationCard key={row.__row} row={row} />;
  return null;
}

function viewTitle(view: NetworkView): string {
  if (view === 'connections') return 'Connections';
  if (view === 'hashtags') return 'Hashtag';
  if (view === 'following') return 'Following';
  if (view === 'followers') return 'Followers';
  if (view === 'groups') return 'Groups';
  if (view === 'pages') return 'Pages';
  if (view === 'events') return 'Events';
  if (view === 'newsletters') return 'Newsletters';
  if (view === 'recommendations-received') return 'Recommendations received';
  if (view === 'recommendations-given') return 'Recommendations given';
  if (view === 'endorsements-received') return 'Endorsements received';
  if (view === 'endorsements-given') return 'Endorsements given';
  if (view === 'invitations-received') return 'Invitations received';
  if (view === 'invitations-sent') return 'Invitations sent';
  if (view === 'invitations') return 'Invitations';
  return 'Connections';
}

function viewSubtitle(view: NetworkView, dataset?: DatasetMeta): string {
  if (view === 'connections') return 'People you are connected with';
  if (view === 'following') return 'People you follow';
  if (view === 'hashtags') return 'Hashtags you follow';
  if (view === 'pages') return 'Pages you follow';
  if (view === 'events') return 'Events you interacted with';
  if (view === 'recommendations-received') return 'Recommendations written for you';
  if (view === 'recommendations-given') return 'Recommendations you have written';
  if (view === 'endorsements-received') return 'Skills others endorsed you for';
  if (view === 'endorsements-given') return 'Skills you endorsed others for';
  if (view === 'invitations-received') return 'Invitations sent to you';
  if (view === 'invitations-sent') return 'Invitations you have sent';
  if (view === 'invitations') return `${dataset?.rowCount ?? 0} invitation(s)`;
  return 'Network';
}

function viewLinkedInHref(
  view: NetworkView,
  linkedInProfile?: LinkedInProfileInfo,
): string | undefined {
  if (view === 'connections')
    return 'https://www.linkedin.com/mynetwork/invite-connect/connections/';
  if (view === 'following')
    return 'https://www.linkedin.com/mynetwork/network-manager/people-follow/following/';
  if (view === 'followers')
    return 'https://www.linkedin.com/mynetwork/network-manager/people-follow/followers/';
  if (view === 'groups') return 'https://www.linkedin.com/groups/';
  if (view === 'hashtags') return 'https://www.linkedin.com/feed/';
  if (view === 'events') return 'https://www.linkedin.com/mynetwork/network-manager/events/';
  if (view === 'pages') return 'https://www.linkedin.com/mynetwork/network-manager/company/';
  if (view === 'newsletters')
    return 'https://www.linkedin.com/mynetwork/network-manager/newsletters/';
  if (view === 'recommendations-received' || view === 'recommendations-given')
    return linkedInProfileSectionUrl(linkedInProfile, 'recommendations');
  if (view === 'endorsements-received' || view === 'endorsements-given')
    return linkedInProfileSectionUrl(linkedInProfile, 'skills');
  if (view === 'invitations-received')
    return 'https://www.linkedin.com/mynetwork/invitation-manager/received/';
  if (view === 'invitations-sent')
    return 'https://www.linkedin.com/mynetwork/invitation-manager/sent/';
  return undefined;
}

function emptyTitle(view: NetworkView): string {
  if (view === 'connections') return 'No connections match this view';
  if (view === 'following') return 'No followed people match this view';
  if (view === 'hashtags') return 'No followed hashtags match this view';
  if (view === 'followers') return 'No followers data in this export';
  if (view === 'groups') return 'No group membership data in this export';
  if (view === 'pages') return 'No followed pages match this view';
  if (view === 'events') return 'No events match this view';
  if (view === 'recommendations-received') return 'No received recommendations match this view';
  if (view === 'recommendations-given') return 'No given recommendations match this view';
  if (view === 'endorsements-received') return 'No received endorsements match this view';
  if (view === 'endorsements-given') return 'No given endorsements match this view';
  if (view === 'invitations-received') return 'No received invitations match this view';
  if (view === 'invitations-sent') return 'No sent invitations match this view';
  return 'No invitations match this view';
}

function emptyDescription(view: NetworkView): string {
  if (view === 'connections') return 'No connections were found in the active import.';
  if (view === 'following') return 'No followed people were found in the active import.';
  if (view === 'hashtags') return 'No followed hashtags were found in the active import.';
  if (view === 'followers') return 'LinkedIn does not include followers in the export.';
  if (view === 'groups')
    return 'LinkedIn does not include group membership in the export. You can view your groups on LinkedIn.';
  if (view === 'pages') return 'No followed pages were found in the active import.';
  if (view === 'events') return 'No events were found in the active import.';
  if (view === 'recommendations-received')
    return 'No received recommendations were found in the active import.';
  if (view === 'recommendations-given')
    return 'No given recommendations were found in the active import.';
  if (view === 'endorsements-received')
    return 'No received endorsements were found in the active import.';
  if (view === 'endorsements-given')
    return 'No given endorsements were found in the active import.';
  if (view === 'invitations-received')
    return 'No received invitations were found in the active import.';
  if (view === 'invitations-sent') return 'No sent invitations were found in the active import.';
  return 'No invitations were found in the active import.';
}

function eventStatusSummary(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (!normalized) return '';
  return `${eventStatusSymbol(normalized)} ${titleCase(normalized)}`;
}

function eventStatusSymbol(status: string): string {
  if (status === 'APPROVED') return '✓';
  if (status === 'RELINQUISHED') return '↩';
  if (status === 'DECLINED') return '✕';
  if (status === 'ATTENDED') return '★';
  if (status === 'WAITLISTED') return '⏳';
  if (status === 'CANCELLED' || status === 'CANCELED') return '⚠';
  if (status === 'REGISTERED') return '•';
  return '•';
}

function isFutureTemporal(temporal: ReturnType<typeof parseTemporalValue>): boolean {
  return typeof temporal?.epochMs === 'number' && temporal.epochMs > Date.now();
}

function invitationDirectionToken(view: NetworkView): string {
  if (view === 'invitations-received') return 'incoming';
  if (view === 'invitations-sent') return 'outgoing';
  return '';
}

function networkViewFromParam(value: string | null): NetworkView {
  if (
    value === 'overview' ||
    value === 'connections' ||
    value === 'hashtags' ||
    value === 'following' ||
    value === 'followers' ||
    value === 'groups' ||
    value === 'pages' ||
    value === 'events' ||
    value === 'newsletters' ||
    value === 'recommendations-received' ||
    value === 'recommendations-given' ||
    value === 'endorsements-received' ||
    value === 'endorsements-given' ||
    value === 'invitations-received' ||
    value === 'invitations-sent' ||
    value === 'invitations'
  ) {
    return value;
  }
  return 'connections';
}

function fullName(row: DatasetRow): string {
  return (
    [cell(row, 'First Name'), cell(row, 'Last Name')].filter(Boolean).join(' ') ||
    'Unknown connection'
  );
}

function cell(row: DatasetRow, key: string): string {
  const value = row[key];
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function temporalFromRow(row: DatasetRow, key: string): ReturnType<typeof parseTemporalValue> {
  const raw = cell(row, key);
  if (!raw) return undefined;
  return row.__dates?.[key] ?? parseTemporalValue(raw);
}

function invitationName(row: DatasetRow): string {
  return invitationDirection(row) === 'incoming' ? cell(row, 'From') : cell(row, 'To');
}

function invitationProfileUrl(row: DatasetRow): string {
  return invitationDirection(row) === 'incoming'
    ? cell(row, 'inviterProfileUrl')
    : cell(row, 'inviteeProfileUrl');
}

function invitationDirection(row: DatasetRow): 'incoming' | 'outgoing' {
  return cell(row, 'Direction').toLowerCase() === 'incoming' ? 'incoming' : 'outgoing';
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}
