import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from './ProfilePage';

const mockUseActiveImport = vi.fn();
const mockUseProfileData = vi.fn();

vi.mock('../../app/useImports', () => ({
  useActiveImport: () => mockUseActiveImport(),
}));

vi.mock('./useProfileData', () => ({
  useProfileData: (...args: unknown[]) => mockUseProfileData(...args),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    mockUseActiveImport.mockReset();
    mockUseProfileData.mockReset();
  });

  it('shows the account creation date in the About section when registration data exists', () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 2,
      totalRows: 4,
      datasets: [],
    });
    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: {
          __row: 0,
          'First Name': 'Ada',
          'Last Name': 'Lovelace',
          Headline: 'Programmer',
          Summary: 'First computer programmer.',
        },
        registration: {
          __row: 0,
          'Registered At': '10/22/10, 9:48 PM',
          __dates: { 'Registered At': { raw: '10/22/10, 9:48 PM', precision: 'date-time' } },
        },
        linkedInProfile: undefined,
        positions: [],
        education: [],
        courses: [],
        honors: [],
        languages: [],
        skills: [],
        recommendationsReceived: [],
        recommendationsGiven: [],
        companyFollows: [],
        memberFollows: [],
        hashtagFollows: [],
        activity: [],
        counts: {
          connections: 0,
          posts: 0,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByText('On LinkedIn since')).toBeInTheDocument();
    expect(screen.getByText('10/22/10, 9:48 PM')).toBeInTheDocument();
  });

  it('links profile counts to the network and activity detail views', () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 2,
      totalRows: 4,
      datasets: [],
    });
    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: {
          __row: 0,
          'First Name': 'Ada',
          'Last Name': 'Lovelace',
          Headline: 'Programmer',
          Summary: 'First computer programmer.',
        },
        registration: undefined,
        linkedInProfile: undefined,
        positions: [],
        education: [],
        courses: [],
        honors: [],
        languages: [],
        skills: [],
        recommendationsReceived: [],
        recommendationsGiven: [],
        companyFollows: [],
        memberFollows: [],
        hashtagFollows: [],
        activity: [],
        counts: {
          connections: 3720,
          posts: 4011,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: '3,720 connections' })).toHaveAttribute(
      'href',
      '/category/network?view=connections',
    );
    expect(screen.getByRole('link', { name: '4,011 posts' })).toHaveAttribute(
      'href',
      '/activity?type=post',
    );
  });

  it('renders intro website links under the address line and exposes the LinkedIn intro actions', () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 2,
      totalRows: 4,
      datasets: [],
    });
    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: {
          __row: 0,
          'First Name': 'Ada',
          'Last Name': 'Lovelace',
          Headline: 'Programmer',
          'Geo Location': 'London, United Kingdom',
          Industry: 'Mathematics',
          Websites: '[PERSONAL:https://ada.example,BLOG:https://notes.example]',
          Summary: 'First computer programmer.',
        },
        registration: undefined,
        linkedInProfile: {
          username: 'ada-lovelace',
          url: 'https://www.linkedin.com/in/ada-lovelace',
        },
        positions: [{ __row: 0, 'Company Name': 'Analytical Engines', __dates: {} }],
        education: [{ __row: 0, 'School Name': 'University of London', __dates: {} }],
        courses: [],
        honors: [],
        languages: [],
        skills: [],
        recommendationsReceived: [],
        recommendationsGiven: [],
        companyFollows: [],
        memberFollows: [],
        hashtagFollows: [],
        activity: [],
        counts: {
          connections: 3720,
          posts: 4011,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    const intro = screen.getByRole('heading', { name: 'Ada Lovelace' }).closest('section');

    expect(intro).not.toBeNull();
    expect(within(intro as HTMLElement).getByRole('link', { name: 'Personal' })).toHaveAttribute(
      'href',
      'https://ada.example',
    );
    expect(within(intro as HTMLElement).getByRole('link', { name: 'Blog' })).toHaveAttribute(
      'href',
      'https://notes.example',
    );
    expect(within(intro as HTMLElement).getByRole('link', { name: 'Add section' })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/ada-lovelace/edit/intro',
    );
    expect(
      within(intro as HTMLElement).getByRole('link', { name: 'Edit intro on LinkedIn' }),
    ).toHaveAttribute('href', 'https://www.linkedin.com/in/ada-lovelace/edit/intro');
    expect(
      within(intro as HTMLElement).queryByRole('link', { name: 'Open to' }),
    ).not.toBeInTheDocument();
  });

  it('renders the updated sections sidebar title and section icons', () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 2,
      totalRows: 4,
      datasets: [],
    });
    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: {
          __row: 0,
          'First Name': 'Ada',
          'Last Name': 'Lovelace',
          Headline: 'Programmer',
          Summary: 'First computer programmer.',
        },
        registration: undefined,
        linkedInProfile: undefined,
        positions: [],
        education: [],
        courses: [],
        honors: [],
        languages: [],
        skills: [],
        recommendationsReceived: [],
        recommendationsGiven: [],
        companyFollows: [],
        memberFollows: [],
        hashtagFollows: [],
        activity: [],
        counts: {
          connections: 0,
          posts: 0,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Sections' })).toBeInTheDocument();

    const navigation = screen.getByRole('navigation', { name: 'Sections' });
    const topLink = within(navigation).getByRole('link', { name: 'Top' });
    expect(topLink.querySelector('svg')).not.toBeNull();
    expect(topLink.querySelector('svg')).toHaveClass('lucide-chevron-up');
    expect(
      within(navigation).getByRole('link', { name: 'About' }).querySelector('svg'),
    ).not.toBeNull();

    const aboutHeading = screen.getByRole('heading', { name: 'About' });
    expect(aboutHeading.querySelector('svg')).toBeNull();
    expect(screen.queryByText(/^Intro$/)).not.toBeInTheDocument();
  });

  it('applies a scroll offset to profile anchor sections', () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 2,
      totalRows: 4,
      datasets: [],
    });
    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: {
          __row: 0,
          'First Name': 'Ada',
          'Last Name': 'Lovelace',
          Headline: 'Programmer',
          Summary: 'First computer programmer.',
        },
        registration: undefined,
        linkedInProfile: undefined,
        positions: [],
        education: [],
        courses: [],
        honors: [],
        languages: [],
        skills: [],
        recommendationsReceived: [],
        recommendationsGiven: [],
        companyFollows: [],
        memberFollows: [],
        hashtagFollows: [],
        activity: [],
        counts: {
          connections: 0,
          posts: 0,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Ada Lovelace' }).closest('section')).toHaveClass(
      'scroll-mt-20',
    );
    expect(screen.getByRole('heading', { name: 'About' }).closest('section')).toHaveClass(
      'scroll-mt-20',
    );
  });

  it('does not render the legacy interests section or sidebar link', () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 2,
      totalRows: 4,
      datasets: [],
    });
    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: {
          __row: 0,
          'First Name': 'Ada',
          'Last Name': 'Lovelace',
          Headline: 'Programmer',
          Summary: 'First computer programmer.',
        },
        registration: undefined,
        linkedInProfile: undefined,
        positions: [],
        education: [],
        courses: [],
        honors: [],
        languages: [],
        skills: [],
        recommendationsReceived: [],
        recommendationsGiven: [],
        companyFollows: [{ __row: 1, Organization: 'Analytical Engines' }],
        memberFollows: [{ __row: 2, FullName: 'Charles Babbage' }],
        hashtagFollows: [{ __row: 3, HashTag: 'computing' }],
        activity: [],
        counts: {
          connections: 0,
          posts: 0,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('heading', { name: 'Interests' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Interests' })).not.toBeInTheDocument();
  });

  it('adds an Open on LinkedIn button to the recommendations section', () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'May 2026 Export',
      createdAt: 0,
      fileCount: 2,
      totalRows: 4,
      datasets: [],
    });
    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: {
          __row: 0,
          'First Name': 'Ada',
          'Last Name': 'Lovelace',
          Headline: 'Programmer',
          Summary: 'First computer programmer.',
        },
        registration: undefined,
        linkedInProfile: {
          username: 'ada-lovelace',
          url: 'https://www.linkedin.com/in/ada-lovelace',
        },
        positions: [],
        education: [],
        courses: [],
        honors: [],
        languages: [],
        skills: [],
        recommendationsReceived: [],
        recommendationsGiven: [],
        companyFollows: [],
        memberFollows: [],
        hashtagFollows: [],
        activity: [],
        counts: {
          connections: 0,
          posts: 0,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    const recommendationsSection = screen
      .getByRole('heading', { name: 'Recommendations' })
      .closest('section');

    expect(recommendationsSection).not.toBeNull();
    expect(
      within(recommendationsSection as HTMLElement).getByRole('link', {
        name: 'Open on LinkedIn',
      }),
    ).toHaveAttribute('href', 'https://www.linkedin.com/in/ada-lovelace/details/recommendations/');
  });
});
