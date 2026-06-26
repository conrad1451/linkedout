import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  ChevronDown,
  type LucideIcon,
  SlidersHorizontal,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { OpenRawTableLink } from '../../components/OpenRawTableLink';
import { useActiveImport } from '../../app/useImports';
import { EmptyState } from '../../components/EmptyState';
import { OpenOnLinkedInLink } from '../../components/OpenOnLinkedInLink';
import { Pagination } from '../../components/Pagination';
import { RowBase } from '../../components/RowBase';
import { parseTemporalValue } from '../../lib/datetime';
import { text } from '../profile/model';
import { useDataset } from '../../hooks/useDataset';
import type { DatasetMeta, DatasetRow } from '../../lib/store';
import { parseLinkedInFormat, extractAlertSummary } from '../../lib/linkedin/job-alert-parser';
import type { AlertSummary } from '../../lib/linkedin/job-alert-parser';
import { parseQAPairs } from '../../lib/linkedin/qa-parser';

const PAGE_SIZE = 25;

type JobsView = 'applications' | 'saved' | 'alerts' | 'preferences';

type JobsDatasetLookup = {
  applications: DatasetMeta | undefined;
  saved: DatasetMeta | undefined;
  alerts: DatasetMeta | undefined;
  preferences: DatasetMeta | undefined;
};

export function JobsPage() {
  const active = useActiveImport();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = jobsViewFromParam(searchParams.get('view'));
  const [page, setPage] = useState(0);

  const datasets: JobsDatasetLookup = {
    applications: active?.datasets.find((d) => d.schemaId === 'jobs-applications'),
    saved: active?.datasets.find((d) => d.schemaId === 'jobs-saved'),
    alerts: active?.datasets.find((d) => d.schemaId === 'saved-job-alerts'),
    preferences: active?.datasets.find((d) => d.schemaId === 'jobs-preferences'),
  };

  const detailDataset = detailDatasetForView(activeView, datasets);

  const { rows, total, loading, error } = useDataset(
    active?.id ?? null,
    activeView === 'preferences' ? null : (detailDataset?.datasetId ?? null),
    {
      offset: page * PAGE_SIZE,
      limit: activeView === 'preferences' ? 1 : PAGE_SIZE,
      dateField: detailDataset?.dateField,
      sort: detailDataset?.dateField ? 'date-desc' : undefined,
    },
  );

  // Preferences is a single row
  const preferences = useDataset(
    activeView === 'preferences' ? (active?.id ?? null) : null,
    activeView === 'preferences' ? (datasets.preferences?.datasetId ?? null) : null,
    { limit: 1 },
  );

  function setView(nextView: JobsView) {
    setPage(0);
    const next = new URLSearchParams(searchParams);
    if (nextView === 'applications') next.delete('view');
    else next.set('view', nextView);
    setSearchParams(next);
  }

  if (!active) {
    return (
      <EmptyState
        title="No active import"
        description="Import a LinkedIn export ZIP before browsing your jobs data."
        action={
          <Link to="/imports" className="btn btn-primary">
            Import data
          </Link>
        }
      />
    );
  }

  const hasAny = datasets.applications || datasets.saved || datasets.alerts || datasets.preferences;

  if (!hasAny) {
    return (
      <EmptyState
        title="No jobs datasets found"
        description="This import does not include any jobs-related CSV files. Try importing a LinkedIn export that includes jobs data."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[18rem_minmax(0,1fr)] md:items-start">
        <JobsRail
          activeView={activeView}
          counts={{
            applications: datasets.applications?.rowCount ?? 0,
            saved: datasets.saved?.rowCount ?? 0,
            alerts: datasets.alerts?.rowCount ?? 0,
          }}
          onSelect={setView}
        />

        <main className="space-y-4">
          {activeView === 'preferences' ? (
            <PreferencesSection
              dataset={datasets.preferences}
              rows={preferences.rows}
              loading={preferences.loading}
              error={preferences.error}
            />
          ) : !detailDataset ? (
            <UnavailableJobsSection
              title={viewTitle(activeView)}
              description="This dataset is not present in the active import."
              linkedInHref={viewLinkedInHref(activeView)}
            />
          ) : (
            <DatasetDetailSection
              title={viewTitle(activeView)}
              subtitle={viewSubtitle(activeView, detailDataset)}
              linkedInHref={viewLinkedInHref(activeView)}
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

// ---------------------------------------------------------------------------
// Rail sidebar
// ---------------------------------------------------------------------------

function JobsRail({
  activeView,
  counts,
  onSelect,
}: {
  activeView: JobsView;
  counts: { applications: number; saved: number; alerts: number };
  onSelect: (view: JobsView) => void;
}) {
  type RailItem = {
    view: JobsView;
    label: string;
    Icon: LucideIcon;
    count: number;
  };

  const items: RailItem[] = [
    {
      view: 'applications',
      label: 'Applications',
      Icon: BriefcaseBusiness,
      count: counts.applications,
    },
    { view: 'saved', label: 'Saved', Icon: Bookmark, count: counts.saved },
    { view: 'alerts', label: 'Alerts', Icon: Bell, count: counts.alerts },
    { view: 'preferences', label: 'Preferences', Icon: SlidersHorizontal, count: 0 },
  ];

  return (
    <aside className="space-y-4 md:sticky md:top-20">
      <section className="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
        <header className="border-b border-base-300 px-4 py-4">
          <h2 className="text-xl font-bold tracking-tight">Jobs</h2>
        </header>
        <nav aria-label="Jobs sections" className="p-2">
          <ul className="menu w-full p-0">
            {items.map((item) => {
              const isActive = activeView === item.view;
              const badge =
                item.view !== 'preferences' && item.count > 0 ? (
                  <span className="badge badge-ghost badge-sm ml-auto">
                    {item.count.toLocaleString()}
                  </span>
                ) : null;

              return (
                <li key={item.view}>
                  <button
                    type="button"
                    className={isActive ? 'menu-active' : ''}
                    onClick={() => onSelect(item.view)}
                  >
                    <item.Icon className="h-4 w-4" />
                    {item.label}
                    {badge}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </section>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Shared detail section (copied + adapted from NetworkPage)
// ---------------------------------------------------------------------------

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
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm opacity-70">
            {total.toLocaleString()} result(s) · {subtitle}
          </p>
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

// ---------------------------------------------------------------------------
// Unavailable section
// ---------------------------------------------------------------------------

function UnavailableJobsSection({
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

// ---------------------------------------------------------------------------
// Preferences section (single row, no pagination)
// ---------------------------------------------------------------------------

function PreferencesSection({
  dataset,
  rows,
  loading,
  error,
}: {
  dataset: DatasetMeta | undefined;
  rows: DatasetRow[];
  loading: boolean;
  error: string | null;
}) {
  const linkedInHref = 'https://www.linkedin.com/jobs/preferences/';

  if (!dataset) {
    return (
      <UnavailableJobsSection
        title="Job Seeker Preferences"
        description="This dataset is not present in the active import."
        linkedInHref={linkedInHref}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
      <div className="border-b border-base-300 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Job Seeker Preferences</h2>
            <p className="text-sm opacity-70">Your job seeking preferences on LinkedIn</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OpenOnLinkedInLink
              href={linkedInHref}
              format="long"
              size="sm"
              label="Open Job Seeker Preferences on LinkedIn"
            />
            {dataset && <OpenRawTableLink to={`/raw/${dataset.datasetId}`} size="sm" />}
          </div>
        </div>
      </div>

      {error ? (
        <div role="alert" className="m-4 alert alert-error">
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="flex justify-center px-4 py-12">
          <div className="loading loading-spinner" aria-label="Loading preferences" />
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-12 sm:px-5">
          <EmptyState
            title="No preferences found"
            description="No job seeker preferences were found in the active import."
          />
        </div>
      ) : (
        (() => {
          const firstRow = rows[0]!;
          return (
            <div className="px-4 py-4 sm:px-5 sm:py-5">
              <dl className="divide-y divide-base-200">
                {Object.entries(firstRow)
                  .filter(([key]) => !key.startsWith('__'))
                  .map(([key, value]) => {
                    const raw = typeof value === 'string' ? value.trim() : String(value ?? '');
                    if (!raw) return null;
                    return (
                      <div key={key} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
                        <dt className="w-full shrink-0 text-sm font-semibold text-base-content/70 sm:w-56">
                          {key}
                        </dt>
                        <dd className="min-w-0 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
                          {raw}
                        </dd>
                      </div>
                    );
                  })}
              </dl>
            </div>
          );
        })()
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Card components
// ---------------------------------------------------------------------------

function JobApplicationCard({ row }: { row: DatasetRow }) {
  const jobTitle = cell(row, 'Job Title') || 'Untitled job';
  const jobUrl = cell(row, 'Job Url');
  const company = cell(row, 'Company Name');
  const appliedTemporal = temporalFromRow(row, 'Application Date');
  const email = cell(row, 'Contact Email');
  const phone = cell(row, 'Contact Phone Number');
  const resume = cell(row, 'Resume Name');
  const rawQa = cell(row, 'Question And Answers');
  const qaPairs = rawQa ? parseQAPairs(rawQa) : [];

  const contactFields: Array<{ label: string; value: string }> = [];
  if (email) contactFields.push({ label: 'Contact Email', value: email });
  if (phone) contactFields.push({ label: 'Phone', value: phone });
  if (resume) contactFields.push({ label: 'Resume', value: resume });

  const hasBody = contactFields.length > 0 || qaPairs.length > 0;

  return (
    <div>
      <RowBase
        title={jobTitle}
        titleHref={jobUrl || undefined}
        primaryLine={company}
        timePrefix="Applied"
        dateTemporal={appliedTemporal}
        date={text(row, 'Application Date')}
      />
      {hasBody && (
        <div className="mx-4 mb-4 space-y-3">
          {contactFields.length > 0 && (
            <dl className="grid gap-x-4 gap-y-2 rounded-lg bg-base-200/60 px-4 py-3 text-sm sm:grid-cols-3 sm:px-5">
              {contactFields.map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-base-content/50">{label}</dt>
                  <dd className="mt-0.5 wrap-break-word">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {qaPairs.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium">
                <span>Application Questions &amp; Answers</span>
                <span className="badge badge-error badge-sm ml-2 align-middle">
                  {qaPairs.length}
                </span>
              </summary>
              <dl className="mt-2 divide-y divide-base-200 rounded-lg border border-base-200 bg-base-100">
                {qaPairs.map((qa, i) => (
                  <div key={i} className="px-3 py-2 first:rounded-t-lg last:rounded-b-lg sm:px-4">
                    <dt className="text-xs font-semibold">{qa.question || 'Free response'}</dt>
                    <dd className="mt-0.5 text-sm text-base-content/70 wrap-break-word whitespace-pre-wrap">
                      {qa.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function SavedJobCard({ row }: { row: DatasetRow }) {
  const jobTitle = cell(row, 'Job Title') || 'Untitled job';
  const jobUrl = cell(row, 'Job Url');
  const company = cell(row, 'Company Name');
  const savedTemporal = temporalFromRow(row, 'Saved Date');

  return (
    <RowBase
      title={jobTitle}
      titleHref={jobUrl || undefined}
      primaryLine={company}
      timePrefix="Saved"
      dateTemporal={savedTemporal}
      date={text(row, 'Saved Date')}
    />
  );
}

function JobAlertCard({ row }: { row: DatasetRow }) {
  const rawAlert = cell(row, 'ALERT_PARAMETERS');
  const rawQuery = cell(row, 'QUERY_CONTEXT');
  const savedSearchId = cell(row, 'SAVED_SEARCH_ID');

  let summary: AlertSummary | null = null;
  let parsedAlert: Record<string, unknown> | null = null;
  let parsedQuery: Record<string, unknown> | null = null;

  try {
    parsedAlert = parseLinkedInFormat(rawAlert) as Record<string, unknown>;
    parsedQuery = parseLinkedInFormat(rawQuery) as Record<string, unknown>;
    summary = extractAlertSummary(parsedAlert, parsedQuery);
  } catch {
    // Malformed entry — still render what we can
  }

  const frequencyLabel =
    summary?.frequency === 'WEEKLY'
      ? 'Weekly'
      : summary?.frequency === 'DAILY'
        ? 'Daily'
        : summary?.frequency || 'Unknown';

  const channelLabels = (summary?.channels ?? [])
    .map((ch) => {
      if (ch === 'INAPP_NOTIFICATION') return 'In-app';
      if (ch === 'EMAIL') return 'Email';
      return ch;
    })
    .join(', ');

  const locationLabel = summary?.geoUrn
    ? summary.radiusKm
      ? `Within ${Math.round(summary.radiusKm)} km of ${summary.geoUrn.replace('urn:li:geo:', 'geo:')}`
      : summary.geoUrn.replace('urn:li:geo:', 'geo:')
    : null;

  const workplaceLabel =
    summary && summary.workplaceTypeUrns.length > 0
      ? summary.workplaceTypeUrns
          .map((u) => {
            const parts = u.split(':');
            return parts[parts.length - 1] ?? u;
          })
          .join(', ')
      : null;

  return (
    <div>
      <div className="flex items-start gap-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="min-w-0 flex-1">
          <div className="min-w-0 space-y-1.5">
            <h3 className="truncate text-lg font-bold">{summary?.keywords || 'Job alert'}</h3>
            {(frequencyLabel || channelLabels) && (
              <p className="text-sm text-base-content/80">
                {frequencyLabel}
                {channelLabels ? ` · ${channelLabels}` : ''}
              </p>
            )}
            {(locationLabel || workplaceLabel) && (
              <p className="text-sm text-base-content/65">
                {[locationLabel, workplaceLabel].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <details className="group border-t border-base-200">
        <summary className="flex cursor-pointer items-center gap-1.5 px-4 py-2 text-xs font-medium text-base-content/50 hover:text-base-content/70 sm:px-5">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          Show alert details
        </summary>
        <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
          {savedSearchId && (
            <div>
              <dt className="text-xs font-medium text-base-content/50">Saved Search ID</dt>
              <dd className="mt-0.5 break-all font-mono text-sm">{savedSearchId}</dd>
            </div>
          )}
          {parsedAlert && (
            <details>
              <summary className="cursor-pointer text-xs font-medium text-base-content/60">
                ALERT_PARAMETERS
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-base-200 p-3 text-xs">
                {JSON.stringify(parsedAlert, null, 2)}
              </pre>
            </details>
          )}
          {parsedQuery && (
            <details>
              <summary className="cursor-pointer text-xs font-medium text-base-content/60">
                QUERY_CONTEXT
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-base-200 p-3 text-xs">
                {JSON.stringify(parsedQuery, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View switch helpers
// ---------------------------------------------------------------------------

function jobsViewFromParam(param: string | null): JobsView {
  if (param === 'saved') return 'saved';
  if (param === 'alerts') return 'alerts';
  if (param === 'preferences') return 'preferences';
  return 'applications';
}

function detailDatasetForView(
  view: JobsView,
  datasets: JobsDatasetLookup,
): DatasetMeta | undefined {
  if (view === 'applications') return datasets.applications;
  if (view === 'saved') return datasets.saved;
  if (view === 'alerts') return datasets.alerts;
  return undefined;
}

function renderViewRow(view: JobsView, row: DatasetRow): ReactNode {
  if (view === 'applications') return <JobApplicationCard key={row.__row} row={row} />;
  if (view === 'saved') return <SavedJobCard key={row.__row} row={row} />;
  if (view === 'alerts') return <JobAlertCard key={row.__row} row={row} />;
  return null;
}

function viewTitle(view: JobsView): string {
  if (view === 'applications') return 'Job Applications';
  if (view === 'saved') return 'Saved Jobs';
  if (view === 'alerts') return 'Job Alerts';
  if (view === 'preferences') return 'Job Seeker Preferences';
  return 'Jobs';
}

function viewSubtitle(view: JobsView, dataset?: DatasetMeta): string {
  if (view === 'applications') return 'Jobs you have applied to';
  if (view === 'saved') return 'Jobs you have saved';
  if (view === 'alerts') return 'Saved job search alerts';
  if (view === 'preferences') return `${dataset?.rowCount ?? 0} preference record(s)`;
  return '';
}

function viewLinkedInHref(view: JobsView): string | undefined {
  if (view === 'applications') return 'https://www.linkedin.com/jobs/';
  if (view === 'saved') return 'https://www.linkedin.com/jobs/collections/saved-jobs/';
  if (view === 'alerts') return 'https://www.linkedin.com/jobs/jam';
  if (view === 'preferences') return 'https://www.linkedin.com/jobs/preferences/';
  return undefined;
}

function emptyTitle(view: JobsView): string {
  if (view === 'applications') return 'No job applications found';
  if (view === 'saved') return 'No saved jobs found';
  if (view === 'alerts') return 'No job alerts found';
  return 'No data found';
}

function emptyDescription(view: JobsView): string {
  if (view === 'applications') return 'No job applications were found in the active import.';
  if (view === 'saved') return 'No saved jobs were found in the active import.';
  if (view === 'alerts') return 'No job alerts were found in the active import.';
  return 'This dataset is empty.';
}

// ---------------------------------------------------------------------------
// Local data helpers
// ---------------------------------------------------------------------------

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
