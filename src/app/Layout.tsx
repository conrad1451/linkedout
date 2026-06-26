import {
  Activity as ActivityIcon,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Database,
  FolderTree,
  Mail,
  Menu,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { formatCompactCount } from '../lib/format';
import { ThemeToggle } from '../components/ThemeToggle';
import { useImports } from './useImports';
import { DonationBanner } from '../features/donation/DonationBanner';

type NavTarget = {
  to: string;
  label: string;
  Icon: LucideIcon;
  badgeLabel?: string;
};

const primaryNavItems: NavTarget[] = [
  { to: '/profile', label: 'Me', Icon: User },
  { to: '/activity', label: 'Activities', Icon: ActivityIcon, badgeLabel: 'activities' },
  { to: '/category/network', label: 'My Network', Icon: Users, badgeLabel: 'connections' },
  {
    to: '/category/jobs',
    label: 'Jobs',
    Icon: BriefcaseBusiness,
    badgeLabel: 'job applications',
  },
  {
    to: '/category/messages',
    label: 'Messages',
    Icon: Mail,
    badgeLabel: 'exported messages',
  },
];

const secondaryNavItems: NavTarget[] = [
  { to: '/raw', label: 'Raw Data', Icon: FolderTree },
  { to: '/imports', label: 'Imports', Icon: Database },
];

export function Layout() {
  const { imports, activeId, activate, loading } = useImports();
  const navigate = useNavigate();
  const activeImport = imports.find((imp) => imp.id === activeId) ?? null;
  const messageRowCount = activeImport ? exportedMessageRowCount(activeImport.datasets) : 0;
  const connectionCount = activeImport ? datasetRowCount(activeImport.datasets, 'connections') : 0;
  const activityCount = activeImport ? activityRowCount(activeImport.datasets) : 0;
  const jobsCount = activeImport
    ? datasetRowCount(activeImport.datasets, 'jobs-applications') +
      datasetRowCount(activeImport.datasets, 'jobs-saved') +
      datasetRowCount(activeImport.datasets, 'saved-job-alerts')
    : 0;

  return (
    <div className="min-h-screen bg-base-200">
      <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 px-3 backdrop-blur sm:px-4">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 xl:flex-none">
            <MobileNavMenu />
            <Link
              to="/"
              className="flex h-full shrink-0 items-center gap-2"
              aria-label="LinkedOut home"
            >
              <img src="/out-logo.svg" alt="" aria-hidden="true" className="h-9 w-9 shrink-0" />
              <span className="hidden text-base font-semibold leading-none tracking-tight text-base-content sm:inline">
                LinkedOut
              </span>
            </Link>
            <div className="join join-horizontal">
              <ImportSlot
                activeId={activeId}
                imports={imports}
                loading={loading}
                onSelect={(id) => {
                  void activate(id);
                  void navigate('/activity');
                }}
                onCreateNew={() => void navigate('/imports')}
              />
              <Link to="/raw" className="btn btn-soft btn-sm join-item h-8" aria-label="Raw Data">
                <FolderTree className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <nav
            className="hidden min-w-0 flex-1 justify-end xl:flex"
            aria-label="Primary navigation"
          >
            <div className="flex h-14 items-stretch">
              {primaryNavItems.map((item) => (
                <HeaderNavLink
                  key={item.to}
                  item={item}
                  badgeCount={headerBadgeCount(item, {
                    messageRowCount,
                    connectionCount,
                    activityCount,
                    jobsCount,
                  })}
                />
              ))}
            </div>
          </nav>

          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <DonationBanner />

      <main className="px-3 py-4 sm:px-4 sm:py-6">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/**
 * Try to extract a date from a LinkedIn export filename.
 * LinkedIn uses the format `..._MM-DD-YYYY.zip`, e.g. `Complete_LinkedInDataExport_06-26-2026.zip`.
 * Returns a Date if found, or null.
 */
function extractDateFromLabel(label: string): Date | null {
  // LinkedIn format: MM-DD-YYYY at the end before optional .zip
  const linkedInMatch = label.match(/(\d{2})-(\d{2})-(\d{4})$/);
  if (linkedInMatch) {
    const [, month, day, year] = linkedInMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

const importDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatImportDisplay(imp: { label: string; totalRows: number; createdAt: number }): string {
  const extracted = extractDateFromLabel(imp.label);
  const date = extracted ?? new Date(imp.createdAt);
  const dateStr = importDateFormatter.format(date);
  const rows = formatCompactCount(imp.totalRows);
  return `${dateStr} · ${rows} rows`;
}

function ImportSlot({
  activeId,
  imports,
  loading,
  onSelect,
  onCreateNew,
}: {
  activeId: string | null;
  imports: Array<{ id: string; label: string; totalRows: number; createdAt: number }>;
  loading: boolean;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}) {
  const activeImport = imports.find((imp) => imp.id === activeId) ?? null;

  if (loading) {
    return (
      <div className="relative min-w-0 flex-1 xl:w-64 xl:flex-none 2xl:w-72">
        <Database className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-base-content/50" />
        <div className="btn btn-ghost btn-sm join-item h-8 w-full justify-start pl-9 text-base-content/60">
          Loading imports
        </div>
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <Link to="/imports" className="btn btn-soft btn-sm join-item h-8 w-full justify-start">
        <Database className="h-4 w-4 shrink-0" />
        <span className="truncate">Import LinkedIn export</span>
      </Link>
    );
  }

  return (
    <div className="dropdown relative min-w-0 flex-1 xl:w-64 xl:flex-none 2xl:w-72">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-soft btn-sm join-item h-8 w-full justify-start pl-9"
        aria-label="Active import"
        title={activeImport?.label ?? 'Select import'}
      >
        <Database className="pointer-events-none absolute left-3 h-4 w-4 text-base-content/60" />
        <span className="truncate">
          {activeImport ? formatImportDisplay(activeImport) : 'Select import'}
        </span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-base-content/50" />
      </div>
      <ul
        tabIndex={0}
        className="menu dropdown-content z-40 mt-1 w-full rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
      >
        {imports.map((imp) => (
          <li key={imp.id}>
            <button type="button" onClick={() => onSelect(imp.id)}>
              <span className="truncate">{formatImportDisplay(imp)}</span>
              {imp.id === activeId && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
            </button>
          </li>
        ))}
        <li className="mt-1 border-t border-base-300 pt-1">
          <button type="button" onClick={onCreateNew}>
            Manage
          </button>
        </li>
      </ul>
    </div>
  );
}

function MobileNavMenu() {
  return (
    <div className="dropdown xl:hidden">
      <button
        type="button"
        tabIndex={0}
        className="btn btn-ghost btn-square"
        aria-label="Open navigation"
        title="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <ul
        tabIndex={0}
        className="menu dropdown-content z-40 mt-2 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
      >
        {[...primaryNavItems, ...secondaryNavItems].map((item) => (
          <li key={item.to}>
            <DropdownNavLink item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeaderNavLink({ item, badgeCount = 0 }: { item: NavTarget; badgeCount?: number }) {
  const Icon = item.Icon;
  const badge = badgeCount > 0 ? formatCompactCount(badgeCount) : null;

  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) => headerNavClass(isActive)}
      title={
        badge && item.badgeLabel
          ? `${item.label}: ${badgeCount.toLocaleString()} ${item.badgeLabel}`
          : item.label
      }
    >
      <span className="indicator">
        <Icon className="h-5 w-5" />
        {badge && (
          <span className="indicator-item badge badge-error badge-xs min-w-5 px-1 text-[0.625rem] font-bold text-error-content">
            {badge}
          </span>
        )}
      </span>
      <span className="leading-none">{item.label}</span>
    </NavLink>
  );
}

function DropdownNavLink({ item }: { item: NavTarget }) {
  const Icon = item.Icon;

  return (
    <NavLink to={item.to} end className={({ isActive }) => (isActive ? 'menu-active' : '')}>
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}

function headerNavClass(active: boolean): string {
  const base =
    'relative flex h-full min-w-16 flex-col items-center justify-center gap-0.5 px-2 text-xs font-medium transition-colors hover:text-base-content focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary';
  const indicator =
    'after:absolute after:right-2 after:bottom-0 after:left-2 after:h-0.5 after:rounded-full after:bg-base-content after:content-[""]';

  return active ? `${base} ${indicator} text-base-content` : `${base} text-base-content/70`;
}

function exportedMessageRowCount(
  datasets: Array<{ category: string; schemaId: string; rowCount: number }>,
): number {
  const primaryMessages = datasets.filter((dataset) => dataset.schemaId === 'messages');
  const source =
    primaryMessages.length > 0
      ? primaryMessages
      : datasets.filter((dataset) => dataset.category === 'messages');
  return source.reduce((sum, dataset) => sum + dataset.rowCount, 0);
}

function datasetRowCount(
  datasets: Array<{ schemaId: string; rowCount: number }>,
  schemaId: string,
): number {
  return datasets
    .filter((dataset) => dataset.schemaId === schemaId)
    .reduce((sum, dataset) => sum + dataset.rowCount, 0);
}

function activityRowCount(datasets: Array<{ schemaId: string; rowCount: number }>): number {
  const schemaIds = [
    'shares',
    'rich-media',
    'comments',
    'reactions',
    'votes',
    'reposts',
    'connections',
    'invitations',
    'member-follows',
    'company-follows',
    'hashtag-follows',
    'events',
  ];

  return schemaIds.reduce((sum, id) => sum + datasetRowCount(datasets, id), 0);
}

function headerBadgeCount(
  item: NavTarget,
  counts: {
    messageRowCount: number;
    connectionCount: number;
    activityCount: number;
    jobsCount: number;
  },
): number {
  if (item.to === '/activity') return counts.activityCount;
  if (item.to === '/category/messages') return counts.messageRowCount;
  if (item.to === '/category/network') return counts.connectionCount;
  if (item.to === '/category/jobs') return counts.jobsCount;
  return 0;
}
