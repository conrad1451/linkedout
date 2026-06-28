import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ChevronUp,
  BriefcaseBusiness,
  CalendarDays,
  ExternalLink,
  GraduationCap,
  Languages,
  Link as LinkIcon,
  MapPin,
  Pencil,
  Quote,
  Sparkles,
  Star,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useActiveImport } from '../../app/useImports';
import { EmptyState } from '../../components/EmptyState';
import { OpenOnLinkedInLink } from '../../components/OpenOnLinkedInLink';
import { RecommendationRow } from '../../components/RecommendationRow';
import { ipGeolocationUrl } from '../../lib/ip-geolocation';
import type { DatasetRow } from '../../lib/store';
import {
  linkedInProfileIntroEditUrl,
  linkedInProfileSectionUrl,
  linkedInProfileSummaryEditUrl,
} from '../../lib/linkedin/profile';
import {
  formatRange,
  displayText,
  formatRowTemporal,
  fullName,
  parseWebsites,
  text,
  type WebsiteLink,
} from './model';
import { LinkedInName } from '../../components/LinkedInName';
import { useProfileData, type ProfileData } from './useProfileData';

const MAX_PROFILE_EXPERIENCE_ITEMS = 5;
const MAX_PROFILE_COURSE_ITEMS = 12;
const MAX_PROFILE_HONOR_ITEMS = 8;
const MAX_PROFILE_SKILL_ITEMS = 10;
const MAX_PROFILE_RECOMMENDATION_ITEMS = 3;
const PROFILE_SECTION_SCROLL_MARGIN_CLASS = 'scroll-mt-20';

const PROFILE_SECTIONS: Array<{ id: string; label: string; icon?: LucideIcon }> = [
  { id: 'intro', label: 'Top', icon: ChevronUp },
  { id: 'about', label: 'About', icon: User },
  { id: 'experience', label: 'Experience', icon: BriefcaseBusiness },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'honors', label: 'Honors', icon: Trophy },
  { id: 'skills', label: 'Skills', icon: Star },
  { id: 'languages', label: 'Languages', icon: Languages },
  { id: 'recommendations', label: 'Recommendations', icon: Quote },
];

export function ProfilePage() {
  const active = useActiveImport();
  const { data, loading, error } = useProfileData(active);

  if (!active) {
    return (
      <EmptyState
        title="No active import"
        description="Import a LinkedIn export ZIP before browsing the profile view."
        action={
          <Link to="/imports" className="btn btn-primary">
            Import data
          </Link>
        }
      />
    );
  }

  if (loading) return <div className="loading loading-spinner" aria-label="Loading profile" />;
  if (error) {
    return (
      <div role="alert" className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }
  if (!data) return <EmptyState title="No profile data found" />;

  return <ProfileSurface data={data} />;
}

function ProfileSurface({ data }: { data: ProfileData }) {
  const name = fullName(data.profile);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem] md:items-start">
      <main className="space-y-4">
        <ProfileHeader data={data} name={name} />
        <AboutSection data={data} />
        <ExperienceSection data={data} />
        <EducationSection data={data} />
        <CoursesSection data={data} />
        <HonorsSection data={data} />
        <SkillsSection data={data} />
        <LanguagesSection data={data} />
        <RecommendationsSection
          linkedInProfile={data.linkedInProfile}
          received={data.recommendationsReceived}
          given={data.recommendationsGiven}
        />
      </main>
      <ProfileSidebar />
    </div>
  );
}

function ProfileSidebar() {
  return (
    <aside className="hidden md:block rounded-box border border-base-300 bg-base-100 p-4 shadow-sm md:sticky md:top-20">
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">Sections</h2>
      <nav aria-label="Sections" className="mt-3">
        <ul className="menu w-full gap-1 p-0">
          {PROFILE_SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="gap-3 font-medium">
                {section.icon && (
                  <span className="rounded-box bg-base-200 p-1.5 text-primary">
                    <section.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <span>{section.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function ProfileHeader({ data, name }: { data: ProfileData; name: string }) {
  const profile = data.profile;
  const websites = parseWebsites(text(profile, 'Websites') || text(profile, 'Web sites'));
  const introEditHref = linkedInProfileIntroEditUrl(data.linkedInProfile);

  return (
    <section
      id="intro"
      className={`${PROFILE_SECTION_SCROLL_MARGIN_CLASS} overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm`}
    >
      <div className="relative h-40 overflow-hidden border-b border-base-300 bg-base-300 sm:h-44">
        <img
          src="/brand/linkedin-default-profile-cover.svg"
          alt=""
          aria-hidden="true"
          className="h-full w-full select-none object-cover"
          draggable={false}
        />
        <LinkedInEditButton
          href={introEditHref}
          label="Edit intro on LinkedIn"
          className="absolute right-4 top-4 bg-base-100/90 shadow-sm backdrop-blur"
        />
      </div>
      <div className="px-5 pb-5 sm:px-7">
        <div className="-mt-10 sm:-mt-12">
          <div className="min-w-0 max-w-3xl">
            <div
              className="relative z-10 inline-flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-4 border-base-100 bg-base-100 text-base-content shadow-sm ring-1 ring-base-300/80"
              aria-label={name}
            >
              <User className="h-14 w-14" aria-hidden="true" />
            </div>

            <div className="mt-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold leading-tight">{name}</h1>
                <BadgeCheck className="h-5 w-5 text-primary" aria-label="Profile imported" />
              </div>
              {text(profile, 'Headline') && (
                <p className="mt-1 text-lg leading-snug">{text(profile, 'Headline')}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm opacity-70">
                {text(profile, 'Geo Location') && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {text(profile, 'Geo Location')}
                  </span>
                )}
                {text(profile, 'Industry') && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{text(profile, 'Industry')}</span>
                  </>
                )}
              </div>
              {websites.length > 0 && <WebsiteLinks links={websites} />}
              <p className="mt-3 text-sm font-semibold text-primary">
                <Link
                  to="/category/network?view=connections"
                  className="transition hover:underline focus-visible:underline"
                >
                  {data.counts.connections.toLocaleString()} connections
                </Link>{' '}
                <span aria-hidden="true">·</span>{' '}
                <Link
                  to="/activity?type=post"
                  className="transition hover:underline focus-visible:underline"
                >
                  {data.counts.posts.toLocaleString()} posts
                </Link>
              </p>
              {introEditHref && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={introEditHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn btn-sm btn-outline border-primary text-primary hover:bg-primary/10"
                  >
                    Add section
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WebsiteLinks({ links }: { links: WebsiteLink[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {links.map((link, index) => (
        <div key={`${link.label}-${link.href}`} className="inline-flex items-center gap-3">
          {index > 0 && (
            <span aria-hidden="true" className="opacity-40">
              ·
            </span>
          )}
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 font-semibold text-primary transition hover:underline focus-visible:underline"
          >
            <LinkIcon className="h-4 w-4" />
            {link.label}
          </a>
        </div>
      ))}
    </div>
  );
}

function AboutSection({ data }: { data: ProfileData }) {
  const summary = text(data.profile, 'Summary');
  const topSkills = data.skills.slice(0, 5).map((skill) => skill.name);
  const joinedOn = formatRowTemporal(data.registration, 'Registered At');
  const registrationIp = data.registration ? text(data.registration, 'Registration Ip') : '';

  return (
    <ProfileCard
      id="about"
      title="About"
      action={
        <LinkedInEditButton
          href={linkedInProfileSummaryEditUrl(data.linkedInProfile)}
          label="Edit about on LinkedIn"
        />
      }
    >
      {summary ? (
        <p className="whitespace-pre-line leading-relaxed">{displayText(summary)}</p>
      ) : (
        <p className="opacity-70">No profile summary was included in this export.</p>
      )}
      {(joinedOn || topSkills.length > 0) && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {joinedOn && (
            <div className="rounded-box border border-base-300 p-4">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarDays className="h-5 w-5 text-primary" />
                On LinkedIn since
              </div>
              <p className="mt-1 text-sm opacity-80">{joinedOn}</p>
              {registrationIp && (
                <p className="mt-1 text-sm tabular-nums">
                  {registrationIp}{' '}
                  <a
                    href={ipGeolocationUrl(registrationIp)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center align-middle hover:text-primary"
                    title={`Look up IP ${registrationIp}`}
                    aria-label={`Look up IP ${registrationIp} on ipgeolocation.io`}
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </p>
              )}
            </div>
          )}
          {topSkills.length > 0 && (
            <div className="rounded-box border border-base-300 p-4">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-5 w-5 text-primary" />
                Top skills
              </div>
              <p className="mt-1 text-sm opacity-80">{topSkills.join(' · ')}</p>
            </div>
          )}
        </div>
      )}
    </ProfileCard>
  );
}

function ExperienceSection({ data }: { data: ProfileData }) {
  const [showAll, setShowAll] = useState(false);
  const hasMore = data.positions.length > MAX_PROFILE_EXPERIENCE_ITEMS;
  const visiblePositions = showAll
    ? data.positions
    : data.positions.slice(0, MAX_PROFILE_EXPERIENCE_ITEMS);

  return (
    <ProfileCard
      id="experience"
      title="Experience"
      action={
        <LinkedInEditButton
          href={linkedInProfileSectionUrl(data.linkedInProfile, 'experience')}
          label="Edit experience on LinkedIn"
        />
      }
      footer={
        hasMore && (
          <ShowAllToggleButton
            expanded={showAll}
            onClick={() => setShowAll((current) => !current)}
            ariaLabel={
              showAll ? 'Show fewer imported experiences' : 'Show all imported experiences'
            }
          />
        )
      }
    >
      <div className="divide-y divide-base-300">
        {visiblePositions.map((row) => (
          <TimelineRow
            key={row.__row}
            logo={<BriefcaseBusiness className="h-5 w-5" />}
            title={text(row, 'Title')}
            subtitle={text(row, 'Company Name')}
            meta={formatRange(text(row, 'Started On'), text(row, 'Finished On'))}
            location={text(row, 'Location')}
            description={displayText(text(row, 'Description'))}
          />
        ))}
      </div>
    </ProfileCard>
  );
}

function EducationSection({ data }: { data: ProfileData }) {
  return (
    <ProfileCard
      id="education"
      title="Education"
      action={
        <LinkedInEditButton
          href={linkedInProfileSectionUrl(data.linkedInProfile, 'education')}
          label="Edit education on LinkedIn"
        />
      }
    >
      <div className="divide-y divide-base-300">
        {data.education.map((row) => (
          <TimelineRow
            key={row.__row}
            logo={<GraduationCap className="h-5 w-5" />}
            title={
              <LinkedInName
                name={text(row, 'School Name') || 'School'}
                showSearch
                searchCategory="schools"
                inline
              />
            }
            subtitle={text(row, 'Degree Name')}
            meta={formatRange(text(row, 'Start Date'), text(row, 'End Date'))}
            description={displayText(text(row, 'Notes') || text(row, 'Activities'))}
          />
        ))}
      </div>
    </ProfileCard>
  );
}

function LinkedInEditButton({
  href,
  label,
  className = '',
}: {
  href: string | undefined;
  label: string;
  className?: string;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`btn btn-sm btn-ghost btn-square ${className}`}
      aria-label={label}
      title={label}
    >
      <Pencil className="h-4 w-4" />
    </a>
  );
}

function CoursesSection({ data }: { data: ProfileData }) {
  const [showAllCourses, setShowAllCourses] = useState(false);
  const courses = data.courses;

  const visibleCourses = showAllCourses ? courses : courses.slice(0, MAX_PROFILE_COURSE_ITEMS);

  return (
    <ProfileCard
      id="courses"
      title="Courses"
      action={
        <LinkedInEditButton
          href={linkedInProfileSectionUrl(data.linkedInProfile, 'courses')}
          label="Edit courses on LinkedIn"
        />
      }
      footer={
        courses.length > MAX_PROFILE_COURSE_ITEMS && (
          <ShowAllToggleButton
            expanded={showAllCourses}
            onClick={() => setShowAllCourses((current) => !current)}
            ariaLabel={showAllCourses ? 'Show fewer imported courses' : 'Show all imported courses'}
          />
        )
      }
    >
      {courses.length === 0 ? (
        <p className="opacity-70">No courses found.</p>
      ) : (
        <PillList rows={visibleCourses} field="Name" icon={<BookOpen className="h-4 w-4" />} />
      )}
    </ProfileCard>
  );
}

function HonorsSection({ data }: { data: ProfileData }) {
  const [showAllHonors, setShowAllHonors] = useState(false);
  const honors = data.honors;

  const visibleHonors = showAllHonors ? honors : honors.slice(0, MAX_PROFILE_HONOR_ITEMS);

  return (
    <ProfileCard
      id="honors"
      title="Honors"
      action={
        <LinkedInEditButton
          href={linkedInProfileSectionUrl(data.linkedInProfile, 'honors')}
          label="Edit honors on LinkedIn"
        />
      }
      footer={
        honors.length > MAX_PROFILE_HONOR_ITEMS && (
          <ShowAllToggleButton
            expanded={showAllHonors}
            onClick={() => setShowAllHonors((current) => !current)}
            ariaLabel={showAllHonors ? 'Show fewer imported honors' : 'Show all imported honors'}
          />
        )
      }
    >
      {honors.length === 0 ? (
        <p className="opacity-70">No honors found.</p>
      ) : (
        <PillList rows={visibleHonors} field="Title" icon={<Trophy className="h-4 w-4" />} />
      )}
    </ProfileCard>
  );
}

function SkillsSection({ data }: { data: ProfileData }) {
  const [showAll, setShowAll] = useState(false);
  const sortedSkills = useMemo(
    () =>
      [...data.skills].sort(
        (a, b) => b.endorsements - a.endorsements || a.name.localeCompare(b.name),
      ),
    [data.skills],
  );
  const visibleSkills = showAll ? sortedSkills : sortedSkills.slice(0, MAX_PROFILE_SKILL_ITEMS);

  return (
    <ProfileCard
      id="skills"
      title="Skills"
      footer={
        sortedSkills.length > MAX_PROFILE_SKILL_ITEMS && (
          <ShowAllToggleButton
            expanded={showAll}
            onClick={() => setShowAll((current) => !current)}
            ariaLabel={showAll ? 'Show fewer imported skills' : 'Show all imported skills'}
          />
        )
      }
    >
      <div className="divide-y divide-base-300">
        {visibleSkills.map((skill) => (
          <div key={skill.name} className="py-4 first:pt-0 last:pb-0">
            <h3 className="font-semibold">{skill.name}</h3>
            <p className="mt-1 flex items-center gap-2 text-sm opacity-70">
              <Users className="h-4 w-4" />
              {skill.endorsements > 0
                ? `${skill.endorsements} endorsement${skill.endorsements === 1 ? '' : 's'}`
                : 'Listed skill'}
            </p>
          </div>
        ))}
      </div>
    </ProfileCard>
  );
}

function LanguagesSection({ data }: { data: ProfileData }) {
  const languages = data.languages;

  return (
    <ProfileCard
      id="languages"
      title="Languages"
      action={
        <LinkedInEditButton
          href={linkedInProfileSectionUrl(data.linkedInProfile, 'languages')}
          label="Edit languages on LinkedIn"
        />
      }
    >
      {languages.length === 0 ? (
        <p className="opacity-70">No languages were included in this export.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {languages.map((language) => (
            <div key={language.__row} className="rounded-box border border-base-300 p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-box bg-primary/10 p-2 text-primary">
                  <Languages className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{text(language, 'Name') || 'Language'}</h3>
                  {text(language, 'Proficiency') && (
                    <p className="mt-1 text-sm opacity-70">{text(language, 'Proficiency')}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ProfileCard>
  );
}

function RecommendationsSection({
  linkedInProfile,
  received,
  given,
}: {
  linkedInProfile: ProfileData['linkedInProfile'];
  received: DatasetRow[];
  given: DatasetRow[];
}) {
  const [tab, setTab] = useState<'received' | 'given'>('received');
  const rows = tab === 'received' ? received : given;
  const visibleRows = rows.slice(0, MAX_PROFILE_RECOMMENDATION_ITEMS);
  const seeAllView = tab === 'received' ? 'recommendations-received' : 'recommendations-given';

  return (
    <ProfileCard
      id="recommendations"
      title="Recommendations"
      action={
        <OpenOnLinkedInLink
          href={linkedInProfileSectionUrl(linkedInProfile, 'recommendations')}
          format="long"
          size="sm"
          label="Open recommendations on LinkedIn"
        />
      }
      footer={
        rows.length > MAX_PROFILE_RECOMMENDATION_ITEMS && (
          <Link
            to={`/category/network?view=${seeAllView}`}
            className="btn btn-sm btn-ghost"
            aria-label={`See all ${tab} recommendations`}
          >
            See All <ArrowRight className="h-4 w-4" />
          </Link>
        )
      }
    >
      <div role="tablist" className="mb-4 flex flex-wrap gap-2">
        <button
          className={pillButtonClass(tab === 'received')}
          onClick={() => setTab('received')}
          type="button"
        >
          Received ({received.length})
        </button>
        <button
          className={pillButtonClass(tab === 'given')}
          onClick={() => setTab('given')}
          type="button"
        >
          Given ({given.length})
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="opacity-70">Nothing to see for now.</p>
      ) : (
        <div className="grid gap-3">
          {visibleRows.map((row) => {
            const name = [text(row, 'First Name'), text(row, 'Last Name')]
              .filter(Boolean)
              .join(' ');
            const headline = [text(row, 'Job Title'), text(row, 'Company')]
              .filter(Boolean)
              .join(' · ');

            return (
              <RecommendationRow
                key={row.__row}
                name={name}
                headline={headline}
                recommendationText={displayText(text(row, 'Text'))}
                variant="profile"
              />
            );
          })}
        </div>
      )}
    </ProfileCard>
  );
}

function pillButtonClass(active: boolean): string {
  const base = 'btn btn-sm min-h-8 rounded-full px-3 font-semibold normal-case';
  if (active) return `${base} btn-primary border-primary`;
  return `${base} btn-outline border-base-content/60 text-base-content hover:border-primary hover:bg-primary/10 hover:text-primary`;
}

function ShowAllToggleButton({
  expanded,
  onClick,
  ariaLabel,
}: {
  expanded: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost"
      aria-expanded={expanded}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {expanded ? 'Show less' : 'Show all'}
      <ArrowRight className={`h-4 w-4 transition-transform ${expanded ? '-rotate-90' : ''}`} />
    </button>
  );
}

function TimelineRow({
  logo,
  title,
  subtitle,
  meta,
  location,
  description,
}: {
  logo: ReactNode;
  title: ReactNode;
  subtitle?: string;
  meta?: string;
  location?: string;
  description?: string;
}) {
  return (
    <div className="flex gap-4 py-5 first:pt-0 last:pb-0">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-base-300 text-center font-bold leading-none text-base-content">
        {logo}
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold leading-snug">{title}</h3>
        {subtitle && <p className="text-sm">{subtitle}</p>}
        {meta && <p className="text-sm opacity-70">{meta}</p>}
        {location && <p className="text-sm opacity-70">{location}</p>}
        {description && (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed opacity-90">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function PillList({ rows, field, icon }: { rows: DatasetRow[]; field: string; icon: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((row) => (
        <span key={row.__row} className="badge badge-outline gap-1 py-3">
          {icon}
          {text(row, field)}
        </span>
      ))}
    </div>
  );
}

function ProfileCard({
  id,
  title,
  subtitle,
  action,
  footer,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`${PROFILE_SECTION_SCROLL_MARGIN_CLASS} rounded-box border border-base-300 bg-base-100 p-5 shadow-sm sm:p-6`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm opacity-70">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
      {footer && (
        <div className="-mx-5 -mb-5 mt-5 border-t border-base-300 px-5 py-3 text-center sm:-mx-6 sm:-mb-6 sm:mt-6 sm:px-6">
          {footer}
        </div>
      )}
    </section>
  );
}
