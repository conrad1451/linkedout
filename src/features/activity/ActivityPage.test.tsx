import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseTemporalValue } from '../../lib/datetime';
import { ActivityPage } from './ActivityPage';

const mockUseActiveImport = vi.fn();
const mockUseProfileData = vi.fn();

vi.mock('../../app/useImports', () => ({
  useActiveImport: () => mockUseActiveImport(),
}));

vi.mock('../profile/useProfileData', () => ({
  useProfileData: (...args: unknown[]) => mockUseProfileData(...args),
}));

describe('ActivityPage', () => {
  beforeEach(() => {
    mockUseActiveImport.mockReset();
    mockUseProfileData.mockReset();
  });

  it("selecting 'All' shows all activities and hides the calendar", async () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'Test Import',
      createdAt: 0,
      fileCount: 1,
      totalRows: 2,
      datasets: [],
    });

    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: { __row: 0, 'First Name': 'Ada', 'Last Name': 'Lovelace', Headline: '' },
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
        activity: [
          {
            id: 'a1',
            kind: 'post',
            date: '2023-01-01 00:00:00',
            dateTemporal: parseTemporalValue('2023-01-01 00:00:00'),
            text: 'Post 2023',
            eyebrow: 'Posted',
          },
          {
            id: 'a2',
            kind: 'post',
            date: '2024-05-05 00:00:00',
            dateTemporal: parseTemporalValue('2024-05-05 00:00:00'),
            text: 'Post 2024',
            eyebrow: 'Posted',
          },
        ],
        counts: {
          connections: 0,
          posts: 2,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/activity?from=2023-01-01&to=2023-12-31']}>
        <ActivityPage />
      </MemoryRouter>,
    );

    // calendar for 2023 should be present initially
    expect(screen.getAllByLabelText(/activity calendar/).length).toBeGreaterThan(0);

    // select the All option
    const select = screen.getByLabelText('Activity year');
    fireEvent.change(select, { target: { value: 'all' } });

    // both activity items should be shown
    expect(await screen.findByText('Post 2023')).toBeInTheDocument();
    expect(await screen.findByText('Post 2024')).toBeInTheDocument();

    // calendar should be hidden when 'All' is selected
    await waitFor(() => expect(screen.queryAllByLabelText(/activity calendar/).length).toBe(0));
  });

  it('shows a removable month badge below the mosaic', async () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'Test Import',
      createdAt: 0,
      fileCount: 1,
      totalRows: 3,
      datasets: [],
    });

    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: { __row: 0, 'First Name': 'Ada', 'Last Name': 'Lovelace', Headline: '' },
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
        activity: [
          {
            id: 'a1',
            kind: 'post',
            date: '2024-08-05 00:00:00',
            dateTemporal: parseTemporalValue('2024-08-05 00:00:00'),
            text: 'August post',
            eyebrow: 'Posted',
          },
          {
            id: 'a2',
            kind: 'post',
            date: '2024-08-15 00:00:00',
            dateTemporal: parseTemporalValue('2024-08-15 00:00:00'),
            text: 'Another August post',
            eyebrow: 'Posted',
          },
          {
            id: 'a3',
            kind: 'post',
            date: '2024-09-01 00:00:00',
            dateTemporal: parseTemporalValue('2024-09-01 00:00:00'),
            text: 'September post',
            eyebrow: 'Posted',
          },
        ],
        counts: {
          connections: 0,
          posts: 3,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/activity?from=2024-08-01&to=2024-08-31']}>
        <ActivityPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('August')).toBeInTheDocument();
    expect(screen.queryByText('September post')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear August filter' }));

    expect(await screen.findByText('September post')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('August')).not.toBeInTheDocument());
  });

  it('shows a removable localized day badge below the mosaic', async () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'Test Import',
      createdAt: 0,
      fileCount: 1,
      totalRows: 3,
      datasets: [],
    });

    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: { __row: 0, 'First Name': 'Ada', 'Last Name': 'Lovelace', Headline: '' },
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
        activity: [
          {
            id: 'a1',
            kind: 'post',
            date: '2024-08-15 00:00:00',
            dateTemporal: parseTemporalValue('2024-08-15 00:00:00'),
            text: 'Selected day post',
            eyebrow: 'Posted',
          },
          {
            id: 'a2',
            kind: 'post',
            date: '2024-08-16 00:00:00',
            dateTemporal: parseTemporalValue('2024-08-16 00:00:00'),
            text: 'Next day post',
            eyebrow: 'Posted',
          },
          {
            id: 'a3',
            kind: 'post',
            date: '2024-09-01 00:00:00',
            dateTemporal: parseTemporalValue('2024-09-01 00:00:00'),
            text: 'Later post',
            eyebrow: 'Posted',
          },
        ],
        counts: {
          connections: 0,
          posts: 3,
          comments: 0,
          reactions: 0,
        },
      },
    });

    const selectedDateLabel = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(
      new Date(2024, 7, 15),
    );

    render(
      <MemoryRouter initialEntries={['/activity?from=2024-08-15&to=2024-08-15']}>
        <ActivityPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(selectedDateLabel)).toBeInTheDocument();
    expect(screen.queryByText('Next day post')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: `Clear ${selectedDateLabel} filter` }));

    expect(await screen.findByText('Next day post')).toBeInTheDocument();
    expect(await screen.findByText('Later post')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(selectedDateLabel)).not.toBeInTheDocument());
  });

  it('shows recommendation filters and applies recommendation activity filtering', async () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'Test Import',
      createdAt: 0,
      fileCount: 1,
      totalRows: 3,
      datasets: [],
    });

    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: { __row: 0, 'First Name': 'Ada', 'Last Name': 'Lovelace', Headline: '' },
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
        activity: [
          {
            id: 'recommendation-received-1',
            kind: 'recommendation-received',
            date: '2025-09-25 17:54:00',
            dateTemporal: parseTemporalValue('2025-09-25 17:54:00'),
            targetName: 'Grace Hopper',
            headline: 'Rear Admiral · US Navy',
            text: 'Ada reviews rigorously.',
            eyebrow: 'Recommendation received',
          },
          {
            id: 'recommendation-given-1',
            kind: 'recommendation-given',
            date: '2025-09-24 09:30:00',
            dateTemporal: parseTemporalValue('2025-09-24 09:30:00'),
            targetName: 'Katherine Johnson',
            headline: 'Mathematician · NASA',
            text: 'I would happily work with Katherine again.',
            eyebrow: 'Recommendation given',
          },
          {
            id: 'post-1',
            kind: 'post',
            date: '2025-01-01 00:00:00',
            dateTemporal: parseTemporalValue('2025-01-01 00:00:00'),
            text: 'General post',
            eyebrow: 'Posted',
          },
        ],
        counts: {
          connections: 0,
          posts: 1,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter
        initialEntries={['/activity?type=recommendation-received&from=2025-01-01&to=2025-12-31']}
      >
        <ActivityPage />
      </MemoryRouter>,
    );

    const givenButtons = screen.getAllByRole('button', { name: /Recommendations sent/ });
    const receivedButtons = screen.getAllByRole('button', {
      name: /Recommendations received/,
    });

    expect(givenButtons.length).toBeGreaterThan(0);
    expect(receivedButtons.length).toBeGreaterThan(0);
    expect(screen.getByText('Ada reviews rigorously.')).toBeInTheDocument();
    expect(
      screen.queryByText('I would happily work with Katherine again.'),
    ).not.toBeInTheDocument();

    fireEvent.click(givenButtons[0]!);

    expect(
      await screen.findByText('I would happily work with Katherine again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Ada reviews rigorously.')).not.toBeInTheDocument();
  });

  it('shows first-wave filters and applies grouped activity filtering', async () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'Test Import',
      createdAt: 0,
      fileCount: 1,
      totalRows: 4,
      datasets: [],
    });

    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: { __row: 0, 'First Name': 'Ada', 'Last Name': 'Lovelace', Headline: '' },
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
        activity: [
          {
            id: 'job-1',
            kind: 'job',
            subtype: 'job-applied',
            date: '2024-12-11 05:58:00',
            dateTemporal: parseTemporalValue('2024-12-11 05:58:00'),
            targetName: 'Divio',
            text: 'Applied to CTO at Divio',
            eyebrow: 'Job application',
          },
          {
            id: 'account-1',
            kind: 'account',
            subtype: 'account-email-update',
            date: '2025-07-29 01:56:00',
            dateTemporal: parseTemporalValue('2025-07-29 01:56:00'),
            text: 'Updated email address: joe@example.com',
            eyebrow: 'Account update',
          },
          {
            id: 'security-1',
            kind: 'security',
            subtype: 'security-login',
            date: '2024-04-03 17:05:36',
            dateTemporal: parseTemporalValue('2024-04-03 17:05:36'),
            targetName: 'Login',
            text: '2001:db8::1',
            eyebrow: 'Login',
          },
        ],
        counts: {
          connections: 0,
          posts: 0,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/activity?type=job&from=2024-01-01&to=2025-12-31']}>
        <ActivityPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('button', { name: /Jobs/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Misc/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Security/ }).length).toBeGreaterThan(0);
    expect(screen.getByText('CTO')).toBeInTheDocument();
    expect(screen.getByText('Divio')).toBeInTheDocument();
    expect(screen.queryByText('joe@example.com')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Security/ })[0]!);

    expect(await screen.findByText('joe@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Applied to CTO at Divio')).not.toBeInTheDocument();
  });

  it('shows second-wave filters and applies message filtering', async () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'Test Import',
      createdAt: 0,
      fileCount: 1,
      totalRows: 3,
      datasets: [],
    });

    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: { __row: 0, 'First Name': 'Ada', 'Last Name': 'Lovelace', Headline: '' },
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
        activity: [
          {
            id: 'message-1',
            kind: 'message',
            subtype: 'message-sent',
            date: '2025-12-16 08:00:14 UTC',
            dateTemporal: parseTemporalValue('2025-12-16 08:00:14 UTC'),
            targetName: 'Emma Taylor',
            text: 'To Emma Taylor: Can we move our call to tomorrow at 3?',
            eyebrow: 'Sent message',
          },
          {
            id: 'learning-1',
            kind: 'learning',
            date: '2025-10-18 18:52 UTC',
            dateTemporal: parseTemporalValue('2025-10-18 18:52 UTC'),
            targetName: 'SQL for Data Analysis',
            text: 'Viewed course: SQL for Data Analysis',
            eyebrow: 'Learning viewed',
          },
        ],
        counts: {
          connections: 0,
          posts: 0,
          comments: 0,
          reactions: 0,
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/activity?type=message&from=2025-01-01&to=2025-12-31']}>
        <ActivityPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('button', { name: /Messages/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Learning/ }).length).toBeGreaterThan(0);
    expect(screen.getByText('Emma Taylor')).toBeInTheDocument();
    // "Sent" appears both as a badge and in the rail; just check its presence
    expect(screen.getAllByText('Sent').length).toBeGreaterThan(0);
    expect(screen.getByText('Can we move our call to tomorrow at 3?')).toBeInTheDocument();
    expect(screen.queryByText('SQL for Data Analysis')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Learning/ })[0]!);

    expect(await screen.findByText('SQL for Data Analysis')).toBeInTheDocument();
    expect(screen.queryByText('Can we move our call to tomorrow at 3?')).not.toBeInTheDocument();
  });

  it('supports nested parent and child filters for endorsements, messages, invitations, engagement, and security', async () => {
    mockUseActiveImport.mockReturnValue({
      id: 'import-1',
      label: 'Test Import',
      createdAt: 0,
      fileCount: 1,
      totalRows: 8,
      datasets: [],
    });

    mockUseProfileData.mockReturnValue({
      loading: false,
      error: null,
      data: {
        profile: { __row: 0, 'First Name': 'Ada', 'Last Name': 'Lovelace', Headline: '' },
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
        activity: [
          {
            id: 'endorsement-given-1',
            kind: 'endorsement',
            subtype: 'endorsement-given',
            date: '2025-01-01 00:00:00',
            dateTemporal: parseTemporalValue('2025-01-01 00:00:00'),
            targetName: 'Grace Hopper',
            text: 'Endorsed Grace Hopper for Leadership',
            eyebrow: 'Endorsement given',
          },
          {
            id: 'endorsement-received-1',
            kind: 'endorsement',
            subtype: 'endorsement-received',
            date: '2025-01-02 00:00:00',
            dateTemporal: parseTemporalValue('2025-01-02 00:00:00'),
            targetName: 'Alan Turing',
            text: 'Received endorsement for Mathematics from Alan Turing',
            eyebrow: 'Endorsement received',
          },
          {
            id: 'message-sent-1',
            kind: 'message',
            subtype: 'message-sent',
            date: '2025-01-03 00:00:00',
            dateTemporal: parseTemporalValue('2025-01-03 00:00:00'),
            targetName: 'Grace Hopper',
            text: 'To Grace Hopper: Hello there',
            eyebrow: 'Sent message',
          },
          {
            id: 'message-received-1',
            kind: 'message',
            subtype: 'message-received',
            date: '2025-01-04 00:00:00',
            dateTemporal: parseTemporalValue('2025-01-04 00:00:00'),
            targetName: 'Alan Turing',
            text: 'Alan Turing: Reply received',
            eyebrow: 'Received message',
          },
          {
            id: 'invitation-sent-1',
            kind: 'invitation-sent',
            targetName: 'Grace Hopper',
            date: '2025-01-05 00:00:00',
            dateTemporal: parseTemporalValue('2025-01-05 00:00:00'),
            text: 'Sent invitation to Grace Hopper',
            eyebrow: 'Invitation sent',
          },
          {
            id: 'invitation-received-1',
            kind: 'invitation-received',
            targetName: 'Alan Turing',
            date: '2025-01-06 00:00:00',
            dateTemporal: parseTemporalValue('2025-01-06 00:00:00'),
            text: 'Invitation from Alan Turing',
            eyebrow: 'Invitation received',
          },
          {
            id: 'reaction-1',
            kind: 'reaction',
            date: '2025-01-07 00:00:00',
            dateTemporal: parseTemporalValue('2025-01-07 00:00:00'),
            text: 'Reacted with Like',
            eyebrow: 'Reacted',
          },
          {
            id: 'repost-1',
            kind: 'repost',
            date: '2025-01-08 00:00:00',
            dateTemporal: parseTemporalValue('2025-01-08 00:00:00'),
            text: 'Reposted an update',
            eyebrow: 'Reposted',
          },
          {
            id: 'login-1',
            kind: 'security',
            subtype: 'security-login',
            date: '2025-01-09 00:00:00',
            dateTemporal: parseTemporalValue('2025-01-09 00:00:00'),
            targetName: 'Login',
            text: '192.0.2.1',
            eyebrow: 'Login',
          },
          {
            id: 'challenge-1',
            kind: 'security',
            subtype: 'security-challenge',
            date: '2025-01-10 00:00:00',
            dateTemporal: parseTemporalValue('2025-01-10 00:00:00'),
            targetName: 'Linkedin App Challenge',
            text: 'Finland',
            eyebrow: 'Security challenge',
          },
        ],
        counts: {
          connections: 0,
          posts: 0,
          comments: 0,
          reactions: 0,
        },
      },
    });

    let view = render(
      <MemoryRouter initialEntries={['/activity?type=endorsement&from=2025-01-01&to=2025-12-31']}>
        <ActivityPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Leadership')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Endorsements/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Endorsements sent/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Messages/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Sent messages/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Connection/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Engagement/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Challenges/ }).length).toBeGreaterThan(0);

    view.unmount();

    view = render(
      <MemoryRouter
        initialEntries={['/activity?type=endorsement-given&from=2025-01-01&to=2025-12-31']}
      >
        <ActivityPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Leadership')).toBeInTheDocument();
    expect(screen.queryByText('Alan Turing')).not.toBeInTheDocument();
    expect(screen.queryByText('Mathematics')).not.toBeInTheDocument();

    view.unmount();

    view = render(
      <MemoryRouter initialEntries={['/activity?type=message&from=2025-01-01&to=2025-12-31']}>
        <ActivityPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('Reply received')).toBeInTheDocument();

    view.unmount();

    view = render(
      <MemoryRouter initialEntries={['/activity?type=message-sent&from=2025-01-01&to=2025-12-31']}>
        <ActivityPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.queryByText('Reply received')).not.toBeInTheDocument();

    view.unmount();

    view = render(
      <MemoryRouter initialEntries={['/activity?type=connections&from=2025-01-01&to=2025-12-31']}>
        <ActivityPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();

    view.unmount();

    view = render(
      <MemoryRouter initialEntries={['/activity?type=engagement&from=2025-01-01&to=2025-12-31']}>
        <ActivityPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Repost')).toBeInTheDocument();
    expect(screen.getByLabelText('Like reaction')).toBeInTheDocument();

    view.unmount();

    view = render(
      <MemoryRouter
        initialEntries={['/activity?type=security-challenges&from=2025-01-01&to=2025-12-31']}
      >
        <ActivityPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Linkedin App Challenge')).toBeInTheDocument();
    expect(screen.getByText('Finland')).toBeInTheDocument();
    expect(screen.queryByText('IP: 192.0.2.1')).not.toBeInTheDocument();
  });
});
