export type DatasetCategory =
  | 'profile'
  | 'posts'
  | 'comments'
  | 'reactions'
  | 'messages'
  | 'network'
  | 'dashboard'
  | 'follows'
  | 'jobs'
  | 'learning'
  | 'privacy'
  | 'ads'
  | 'other';

export interface DatasetSchema {
  id: string;
  filename: string;
  title: string;
  category: DatasetCategory;
  dateField?: string;
  linkField?: string;
  linkedInHref?: string;
  description?: string;
}

const REGISTRY: readonly DatasetSchema[] = [
  {
    id: 'profile',
    filename: 'Profile.csv',
    title: 'Profile',
    category: 'profile',
    dateField: 'Birth Date',
  },
  {
    id: 'profile-summary',
    filename: 'Profile Summary.csv',
    title: 'Profile Summary',
    category: 'profile',
  },
  {
    id: 'positions',
    filename: 'Positions.csv',
    title: 'Positions',
    category: 'profile',
    dateField: 'Started On',
  },
  {
    id: 'education',
    filename: 'Education.csv',
    title: 'Education',
    category: 'profile',
    dateField: 'Start Date',
  },
  { id: 'skills', filename: 'Skills.csv', title: 'Skills', category: 'profile' },
  { id: 'languages', filename: 'Languages.csv', title: 'Languages', category: 'profile' },
  {
    id: 'honors',
    filename: 'Honors.csv',
    title: 'Honors',
    category: 'profile',
    dateField: 'Issued On',
  },
  { id: 'courses', filename: 'Courses.csv', title: 'Courses', category: 'profile' },
  {
    id: 'email-addresses',
    filename: 'Email Addresses.csv',
    title: 'Email Addresses',
    category: 'privacy',
    dateField: 'Updated On',
  },
  {
    id: 'phone-numbers',
    filename: 'PhoneNumbers.csv',
    title: 'Phone Numbers',
    category: 'profile',
  },
  {
    id: 'registration',
    filename: 'Registration.csv',
    title: 'Registration',
    category: 'privacy',
    dateField: 'Registered At',
  },
  {
    id: 'verifications',
    filename: 'Verifications/Verifications.csv',
    title: 'Verifications',
    category: 'profile',
    dateField: 'Verified date',
  },

  {
    id: 'shares',
    filename: 'Shares.csv',
    title: 'Posts (Shares)',
    category: 'posts',
    dateField: 'Date',
    linkField: 'ShareLink',
  },
  { id: 'articles', filename: 'Articles/Articles.csv', title: 'Articles', category: 'posts' },
  {
    id: 'reposts',
    filename: 'InstantReposts.csv',
    title: 'Reposts',
    category: 'posts',
    dateField: 'Date',
    linkField: 'Link',
  },
  {
    id: 'rich-media',
    filename: 'Rich_Media.csv',
    title: 'Rich Media',
    category: 'posts',
    dateField: 'Date/Time',
    linkField: 'Media Link',
  },

  {
    id: 'comments',
    filename: 'Comments.csv',
    title: 'Comments',
    category: 'comments',
    dateField: 'Date',
    linkField: 'Link',
  },

  {
    id: 'reactions',
    filename: 'Reactions.csv',
    title: 'Reactions',
    category: 'reactions',
    dateField: 'Date',
    linkField: 'Link',
  },
  {
    id: 'votes',
    filename: 'Votes.csv',
    title: 'Poll Votes',
    category: 'reactions',
    dateField: 'Date',
    linkField: 'Link',
  },

  {
    id: 'messages',
    filename: 'messages.csv',
    title: 'Messages',
    category: 'messages',
    dateField: 'DATE',
  },
  {
    id: 'guide-messages',
    filename: 'guide_messages.csv',
    title: 'Guide Messages',
    category: 'messages',
    dateField: 'DATE',
  },
  {
    id: 'learning-coach-messages',
    filename: 'learning_coach_messages.csv',
    title: 'Learning Coach Messages',
    category: 'messages',
    dateField: 'DATE',
  },
  {
    id: 'learning-role-play-messages',
    filename: 'learning_role_play_messages.csv',
    title: 'Learning Role-Play Messages',
    category: 'messages',
    dateField: 'DATE',
  },
  {
    id: 'learning-coach-messages-legacy',
    filename: 'LearningCoachMessages.csv',
    title: 'Learning Coach Messages (Legacy)',
    category: 'messages',
  },

  {
    id: 'connections',
    filename: 'Connections.csv',
    title: 'Connections',
    category: 'network',
    dateField: 'Connected On',
  },
  {
    id: 'invitations',
    filename: 'Invitations.csv',
    title: 'Pending Invitation',
    category: 'network',
    dateField: 'Sent At',
  },
  {
    id: 'imported-contacts',
    filename: 'ImportedContacts.csv',
    title: 'Imported Contacts',
    category: 'privacy',
    dateField: 'CreatedAt',
  },
  {
    id: 'services-marketplace-providers',
    filename: 'Services Marketplace/Providers.csv',
    title: 'Services Marketplace Providers',
    category: 'network',
  },
  {
    id: 'endorsements-given',
    filename: 'Endorsement_Given_Info.csv',
    title: 'Endorsements Given',
    category: 'dashboard',
    dateField: 'Endorsement Date',
  },
  {
    id: 'endorsements-received',
    filename: 'Endorsement_Received_Info.csv',
    title: 'Endorsements Received',
    category: 'dashboard',
    dateField: 'Endorsement Date',
  },
  {
    id: 'recommendations-given',
    filename: 'Recommendations_Given.csv',
    title: 'Recommendations Given',
    category: 'profile',
    dateField: 'Creation Date',
  },
  {
    id: 'recommendations-received',
    filename: 'Recommendations_Received.csv',
    title: 'Recommendations Received',
    category: 'profile',
    dateField: 'Creation Date',
  },

  {
    id: 'member-follows',
    filename: 'Member_Follows.csv',
    title: 'People Followed',
    category: 'follows',
    dateField: 'Date',
  },
  {
    id: 'company-follows',
    filename: 'Company Follows.csv',
    title: 'Companies Followed',
    category: 'follows',
    dateField: 'Followed On',
  },
  {
    id: 'hashtag-follows',
    filename: 'Hashtag_Follows.csv',
    title: 'Hashtags Followed',
    category: 'follows',
    dateField: 'CreatedTime',
  },
  {
    id: 'events',
    filename: 'Events.csv',
    title: 'Events',
    category: 'follows',
    dateField: 'Event Time',
  },
  {
    id: 'saved-items',
    filename: 'Saved_Items.csv',
    title: 'Saved Items',
    category: 'follows',
    dateField: 'CreatedTime',
    linkField: 'savedItem',
  },

  {
    id: 'jobs-applications',
    filename: 'Jobs/Job Applications.csv',
    title: 'Job Applications',
    category: 'jobs',
    dateField: 'Application Date',
    linkField: 'Job Url',
  },
  {
    id: 'jobs-saved',
    filename: 'Jobs/Saved Jobs.csv',
    title: 'Saved Jobs',
    category: 'jobs',
    dateField: 'Saved Date',
    linkField: 'Job Url',
  },
  {
    id: 'jobs-preferences',
    filename: 'Jobs/Job Seeker Preferences.csv',
    title: 'Job Seeker Preferences',
    category: 'jobs',
    linkedInHref: 'https://www.linkedin.com/jobs/preferences/',
  },
  {
    id: 'saved-job-alerts',
    filename: 'SavedJobAlerts.csv',
    title: 'Saved Job Alerts',
    category: 'jobs',
    linkedInHref: 'https://www.linkedin.com/jobs/jam',
  },

  {
    id: 'learning',
    filename: 'Learning.csv',
    title: 'Learning Activity',
    category: 'learning',
    dateField: 'Content Last Watched Date (if viewed)',
  },

  {
    id: 'logins',
    filename: 'Logins.csv',
    title: 'Logins',
    category: 'privacy',
    dateField: 'Login Date',
  },
  {
    id: 'security-challenges',
    filename: 'Security Challenges.csv',
    title: 'Security Challenges',
    category: 'privacy',
    dateField: 'Challenge Date',
  },
  {
    id: 'search-queries',
    filename: 'SearchQueries.csv',
    title: 'Search Queries',
    category: 'privacy',
    dateField: 'Time',
  },
  {
    id: 'inferences',
    filename: 'Inferences_about_you.csv',
    title: 'Inferences About You',
    category: 'privacy',
  },
  {
    id: 'receipts',
    filename: 'Receipts_v2.csv',
    title: 'Receipts',
    category: 'privacy',
    dateField: 'Transaction Made At',
  },

  {
    id: 'ads-clicked',
    filename: 'Ads Clicked.csv',
    title: 'Ads Clicked',
    category: 'ads',
    dateField: 'Ad clicked Date',
  },
  {
    id: 'ads-targeting',
    filename: 'Ad_Targeting.csv',
    title: 'Ad Targeting Criteria',
    category: 'ads',
  },
  {
    id: 'ads-lan-engagement',
    filename: 'LAN Ads Engagement.csv',
    title: 'LinkedIn Audience Network Ads',
    category: 'ads',
    dateField: 'Date',
  },
];

const BY_FILENAME = new Map<string, DatasetSchema>(REGISTRY.map((s) => [s.filename, s]));
const BY_BASENAME = new Map<string, DatasetSchema>(REGISTRY.map((s) => [basename(s.filename), s]));
const BY_ID = new Map<string, DatasetSchema>(REGISTRY.map((s) => [s.id, s]));

export function getSchemas(): readonly DatasetSchema[] {
  return REGISTRY;
}

export function getSchemaById(id: string): DatasetSchema | undefined {
  return BY_ID.get(id);
}

export function findSchemaForFile(path: string): DatasetSchema | undefined {
  const normalized = normalize(path);
  const base = basename(normalized);

  // Fast-path: exact filename or basename match
  const exact = BY_FILENAME.get(normalized) ?? BY_BASENAME.get(base);
  if (exact) return exact;

  // Case-insensitive match against registry entries
  const lowerNormalized = normalized.toLowerCase();
  const lowerBase = base.toLowerCase();
  for (const s of REGISTRY) {
    const sNormalized = normalize(s.filename);
    if (sNormalized.toLowerCase() === lowerNormalized) return s;
    const sBase = basename(sNormalized);
    if (sBase.toLowerCase() === lowerBase) return s;
  }

  // Strip trailing numeric suffixes (e.g. Comments_91029461.csv) and try again
  const baseStripped = base.replace(/[-_]\d+(?=\.csv$)/i, '');
  if (baseStripped !== base) {
    const match = BY_BASENAME.get(baseStripped) ?? BY_BASENAME.get(baseStripped.toLowerCase());
    if (match) return match;
    for (const s of REGISTRY) {
      const sBase = basename(normalize(s.filename));
      if (sBase.toLowerCase() === baseStripped.toLowerCase()) return s;
    }
  }

  // Fallback: slugified match to tolerate punctuation/spaces differences
  const target = slugify(base.replace(/\.csv$/i, ''));
  if (target) {
    for (const s of REGISTRY) {
      const sSlug = slugify(basename(s.filename).replace(/\.csv$/i, ''));
      if (sSlug === target) return s;
    }
  }

  return undefined;
}

export function fallbackSchemaForFile(path: string): DatasetSchema {
  const normalized = normalize(path);
  const base = basename(normalized);
  const id = slugify(base.replace(/\.csv$/i, '')) || 'unknown';
  return {
    id: `raw-${id}`,
    filename: normalized,
    title: base.replace(/\.csv$/i, ''),
    category: 'other',
  };
}

export function resolveSchemaForFile(path: string): DatasetSchema {
  return findSchemaForFile(path) ?? fallbackSchemaForFile(path);
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

function basename(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? path : path.slice(i + 1);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
