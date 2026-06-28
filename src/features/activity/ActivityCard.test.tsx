import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatTemporal, parseTemporalValue } from '../../lib/datetime';
import type { ActivityItem } from '../profile/model';
import { ActivityCard } from './ActivityCard';

describe('ActivityCard', () => {
  it('shows reaction text, relative time, emoji icon, and LinkedIn link for reactions', () => {
    const activity: ActivityItem = {
      id: 'reaction-1',
      kind: 'reaction',
      date: '2025-12-15 21:54:39',
      dateTemporal: parseTemporalValue('2025-12-15 21:54:39'),
      text: 'Reacted with Praise',
      eyebrow: 'Reacted',
      href: 'https://www.linkedin.com/feed/update/example',
      reactionType: 'Praise',
    };

    render(<ActivityCard activity={activity} profileName="Ada Lovelace" />);

    expect(screen.getByRole('img', { name: 'Celebrate reaction' })).toHaveTextContent('👏');
    expect(screen.getByRole('link', { name: /Reacted with Praise/ })).toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
  });

  it('shows the selected option and Vote icon for poll votes', () => {
    const activity: ActivityItem = {
      id: 'vote-1',
      kind: 'vote',
      date: '2025-12-16 08:00:00',
      dateTemporal: parseTemporalValue('2025-12-16 08:00:00'),
      text: 'Voted: Remote first',
      eyebrow: 'Voted in a poll',
      href: 'https://www.linkedin.com/feed/update/example',
    };

    render(<ActivityCard activity={activity} profileName="Ada Lovelace" />);

    expect(screen.getByText('Voted: Remote first')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voted: Remote first/ })).toBeInTheDocument();
  });

  it('renders recommendation activities with name, headline, status, and exact timestamp', () => {
    const raw = '09/25/25, 05:54 PM';
    const temporal = parseTemporalValue(raw);
    if (!temporal) throw new Error('Expected recommendation timestamp to parse');

    const activity: ActivityItem = {
      id: 'recommendation-1',
      kind: 'recommendation-received',
      date: raw,
      dateTemporal: temporal,
      targetName: 'Grace Hopper',
      headline: 'Rear Admiral · US Navy',
      text: 'Ada reviews rigorously and supports the whole team.',
      eyebrow: 'Recommendation received',
      status: 'VISIBLE',
    };

    render(<ActivityCard activity={activity} profileName="Ada Lovelace" />);

    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Rear Admiral · US Navy')).toBeInTheDocument();
    expect(screen.getByText('Visible')).toBeInTheDocument();
    expect(
      screen.getByText('Ada reviews rigorously and supports the whole team.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Recommendation received · ${formatTemporal(temporal, raw)}`),
    ).toBeInTheDocument();
  });

  it('renders first-wave grouped activity items with the existing generic activity card chrome', () => {
    const raw = '12/11/24, 5:58 AM';
    const temporal = parseTemporalValue(raw);
    if (!temporal) throw new Error('Expected job timestamp to parse');

    const activity: ActivityItem = {
      id: 'job-application-1',
      kind: 'job',
      date: raw,
      dateTemporal: temporal,
      text: 'Applied to CTO at Divio',
      eyebrow: 'Job application',
      href: 'http://www.linkedin.com/jobs/view/4090520279',
    };

    render(<ActivityCard activity={activity} profileName="Ada Lovelace" />);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Applied to CTO at Divio')).toBeInTheDocument();
    expect(screen.getByText(/Job application/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ada Lovelace/ })).toBeInTheDocument();
  });

  it('renders second-wave message and learning items with the same generic activity card styling', () => {
    const messageTemporal = parseTemporalValue('2025-12-16 08:00:14 UTC');
    const learningTemporal = parseTemporalValue('2025-10-18 18:52 UTC');
    if (!messageTemporal || !learningTemporal) {
      throw new Error('Expected second-wave timestamps to parse');
    }

    render(
      <>
        <ActivityCard
          activity={{
            id: 'message-1',
            kind: 'message',
            subtype: 'message-sent',
            date: '2025-12-16 08:00:14 UTC',
            dateTemporal: messageTemporal,
            targetName: 'Emma Taylor',
            href: 'https://www.linkedin.com/in/emma-taylor-0305',
            text: 'To Emma Taylor: Can we move our call to tomorrow at 3?',
            eyebrow: 'Sent message',
          }}
          profileName="Ada Lovelace"
        />
        <ActivityCard
          activity={{
            id: 'learning-1',
            kind: 'learning',
            date: '2025-10-18 18:52 UTC',
            dateTemporal: learningTemporal,
            targetName: 'SQL for Data Analysis',
            text: 'Viewed course: SQL for Data Analysis',
            eyebrow: 'Learning viewed',
            learningDescription:
              '<p>Master SQL <b>queries</b>, joins, and <i>window functions</i>.</p>',
          }}
          profileName="Ada Lovelace"
        />
      </>,
    );

    expect(screen.getByText('Emma Taylor')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Can we move our call to tomorrow at 3?')).toBeInTheDocument();
    expect(screen.getByText('SQL for Data Analysis')).toBeInTheDocument();
    // HTML description rendered via dangerouslySetInnerHTML
    const desc = document.querySelector('.space-y-2');
    expect(desc).toBeTruthy();
    expect(desc!.textContent).toContain('Master SQL queries, joins, and window functions');
  });

  it('renders security challenge card with IP geolocation link for IPv4', () => {
    const temporal = parseTemporalValue('2025-06-15 10:30:00');
    if (!temporal) throw new Error('Expected timestamp to parse');

    render(
      <ActivityCard
        activity={{
          id: 'challenge-1',
          kind: 'security',
          subtype: 'security-challenge',
          date: '2025-06-15 10:30:00',
          dateTemporal: temporal,
          targetName: 'App Challenge',
          text: 'Finland',
          challengeIp: '2.56.188.34',
          challengeUserAgent: 'Mozilla/5.0',
          eyebrow: 'Security challenge',
        }}
        profileName="Test User"
      />,
    );

    expect(screen.getByText('IP: 2.56.188.34')).toBeInTheDocument();
    const ipLink = screen.getByRole('link', {
      name: 'Look up IP 2.56.188.34 on ipgeolocation.io',
    });
    expect(ipLink).toBeInTheDocument();
    expect(ipLink).toHaveAttribute('href', 'https://ipgeolocation.io/what-is-my-ip/2.56.188.34');
  });

  it('renders security login card with IP geolocation link for IPv6', () => {
    const temporal = parseTemporalValue('2025-06-16 11:00:00');
    if (!temporal) throw new Error('Expected timestamp to parse');

    render(
      <ActivityCard
        activity={{
          id: 'login-1',
          kind: 'security',
          subtype: 'security-login',
          date: '2025-06-16 11:00:00',
          dateTemporal: temporal,
          targetName: 'Login',
          text: '2001:4860:4860::8888',
          loginIp: '2001:4860:4860::8888',
          loginUserAgent: 'Mozilla/5.0',
          eyebrow: 'Login',
        }}
        profileName="Test User"
      />,
    );

    expect(screen.getByText('IP: 2001:4860:4860::8888')).toBeInTheDocument();
    const ipLink = screen.getByRole('link', {
      name: 'Look up IP 2001:4860:4860::8888 on ipgeolocation.io',
    });
    expect(ipLink).toBeInTheDocument();
    // IPv6 colons should be URL-encoded as %3A
    expect(ipLink).toHaveAttribute(
      'href',
      'https://ipgeolocation.io/what-is-my-ip/2001%3A4860%3A4860%3A%3A8888',
    );
  });

  it('does not render IP geolocation link when IP is absent', () => {
    const temporal = parseTemporalValue('2025-06-17 12:00:00');
    if (!temporal) throw new Error('Expected timestamp to parse');

    render(
      <ActivityCard
        activity={{
          id: 'login-no-ip',
          kind: 'security',
          subtype: 'security-login',
          date: '2025-06-17 12:00:00',
          dateTemporal: temporal,
          targetName: 'Login',
          text: 'Login activity',
          loginUserAgent: 'Mozilla/5.0',
          eyebrow: 'Login',
        }}
        profileName="Test User"
      />,
    );

    expect(screen.queryByText(/IP:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ipgeolocation/ })).not.toBeInTheDocument();
  });
});
