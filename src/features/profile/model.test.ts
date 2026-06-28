import { describe, expect, it } from 'vitest';
import { formatTemporal, parseTemporalValue } from '../../lib/datetime';
import {
  displayText,
  endorsementCounts,
  formatRowTemporal,
  makeActivities,
  parseWebsites,
  sortPositions,
} from './model';
import type { DatasetRow } from '../../lib/store';

describe('profile model', () => {
  it('sorts current and recent positions first', () => {
    const rows: DatasetRow[] = [
      { __row: 0, 'Company Name': 'Old', 'Started On': 'Jan 2020', 'Finished On': 'Dec 2020' },
      { __row: 1, 'Company Name': 'Current', 'Started On': 'Aug 2024', 'Finished On': '' },
      { __row: 2, 'Company Name': 'Older current', 'Started On': 'Jan 2023', 'Finished On': '' },
    ];

    expect(sortPositions(rows).map((row) => row['Company Name'])).toEqual([
      'Current',
      'Older current',
      'Old',
    ]);
  });

  it('merges activity streams newest first', () => {
    const activity = makeActivities({
      shares: [{ __row: 0, Date: '2025-01-01 10:00:00', ShareCommentary: 'post' }],
      richMedia: [],
      comments: [{ __row: 0, Date: '2025-01-02 10:00:00', Message: 'comment' }],
      reactions: [{ __row: 0, Date: '2024-12-31 10:00:00', Type: 'PRAISE' }],
      votes: [],
      reposts: [],
    });

    expect(activity.map((item) => item.kind)).toEqual(['comment', 'post', 'reaction']);
  });

  it('includes uploaded media and poll votes in the activity stream', () => {
    const richMediaDate = 'You uploaded a video on March 31, 2024 at 8:06 PM (GMT)';
    const parsedRichMediaDate = parseTemporalValue(richMediaDate);
    if (!parsedRichMediaDate) {
      throw new Error('Expected rich media date to parse');
    }

    const activity = makeActivities({
      shares: [],
      richMedia: [
        {
          __row: 0,
          'Date/Time': richMediaDate,
          'Media Description': 'Uploaded launch recap',
          'Media Link': 'https://media.example/video',
          __dates: { 'Date/Time': parsedRichMediaDate },
        },
      ],
      comments: [],
      reactions: [],
      votes: [
        {
          __row: 0,
          Date: '2025-01-02 10:00:00',
          Link: 'https://www.linkedin.com/feed/update/example',
          OptionText: 'Remote first',
        },
      ],
      reposts: [],
    });

    expect(activity[0]).toMatchObject({
      id: 'vote-0',
      kind: 'vote',
      text: 'Voted: Remote first',
    });
    expect(activity[1]).toMatchObject({
      id: 'rich-media-0',
      kind: 'rich-media',
      eyebrow: 'Rich media',
      href: 'https://media.example/video',
    });
  });

  it('includes given and received recommendations in the activity stream', () => {
    const receivedAt = '2025-01-04 10:00:00';
    const givenAt = '2025-01-03 09:30:00';
    const activity = makeActivities({
      shares: [],
      richMedia: [],
      comments: [],
      reactions: [],
      votes: [],
      reposts: [],
      recommendationsReceived: [
        {
          __row: 0,
          'First Name': 'Alan',
          'Last Name': 'Turing',
          'Job Title': 'Principal Scientist',
          Company: 'Bletchley Park',
          Text: 'Ada brings rigor to every review.',
          'Creation Date': receivedAt,
          Status: 'VISIBLE',
          __dates: { 'Creation Date': parseTemporalValue(receivedAt)! },
        },
      ],
      recommendationsGiven: [
        {
          __row: 1,
          'First Name': 'Grace',
          'Last Name': 'Hopper',
          'Job Title': 'Rear Admiral',
          Company: 'US Navy',
          Text: 'I would happily work with Ada again.',
          'Creation Date': givenAt,
          __dates: { 'Creation Date': parseTemporalValue(givenAt)! },
        },
      ],
    });

    expect(activity[0]).toMatchObject({
      kind: 'recommendation-received',
      targetName: 'Alan Turing',
      headline: 'Principal Scientist · Bletchley Park',
      status: 'VISIBLE',
    });
    expect(activity[1]).toMatchObject({
      kind: 'recommendation-given',
      targetName: 'Grace Hopper',
      headline: 'Rear Admiral · US Navy',
    });
  });

  it('includes first-wave jobs, account, security, and search events in the activity stream', () => {
    const appliedAt = '12/11/24, 5:58 AM';
    const loginAt = 'Wed Apr 03 17:05:36 UTC 2024';
    const activity = makeActivities({
      shares: [],
      richMedia: [],
      comments: [],
      reactions: [],
      votes: [],
      reposts: [],
      jobApplications: [
        {
          __row: 0,
          'Application Date': appliedAt,
          'Job Title': 'CTO',
          'Company Name': 'Divio',
          'Job Url': 'http://www.linkedin.com/jobs/view/4090520279',
          __dates: { 'Application Date': parseTemporalValue(appliedAt)! },
        },
      ],
      adsClicked: [
        { __row: 1, 'Ad clicked Date': '2025/11/14 09:42:01 UTC', 'Ad Title/Id': '820383143' },
      ],
      savedItems: [
        {
          __row: 2,
          savedItem: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
          CreatedTime: '2025-12-05 18:03:08',
          __dates: { CreatedTime: parseTemporalValue('2025-12-05 18:03:08')! },
        },
      ],
      endorsementsReceived: [
        {
          __row: 3,
          'Endorsement Date': '2025/12/16 10:41:04 UTC',
          'Skill Name': 'Large Language Models (LLM)',
          'Endorser First Name': 'Joe',
          'Endorser Last Name': 'Smith',
          'Endorsement Status': 'ACCEPTED',
          __dates: { 'Endorsement Date': parseTemporalValue('2025/12/16 10:41:04 UTC')! },
        },
      ],
      emailAddresses: [
        {
          __row: 4,
          'Email Address': 'joe@example.com',
          Confirmed: 'Yes',
          Primary: 'Yes',
          'Updated On': '7/29/25, 1:56 AM',
          __dates: { 'Updated On': parseTemporalValue('7/29/25, 1:56 AM')! },
        },
      ],
      logins: [
        {
          __row: 5,
          'Login Date': loginAt,
          'IP Address': '2001:db8::1',
          'Login Type': 'Login',
          __dates: { 'Login Date': parseTemporalValue(loginAt)! },
        },
      ],
      searchQueries: [
        {
          __row: 6,
          Time: '2025/11/22 08:20:25 UTC',
          'Search Query': 'staff engineer',
          __dates: { Time: parseTemporalValue('2025/11/22 08:20:25 UTC')! },
        },
      ],
      receipts: [
        {
          __row: 7,
          'Transaction Made At': '12/10/24 11:31 AM UTC',
          Description: 'Premium Business',
          'Sub Total': '0.00',
          'Tax Amount': '0.00',
          'Total Amount': '0.00',
          'Currency Code': 'SEK',
          __dates: { 'Transaction Made At': parseTemporalValue('12/10/24 11:31 AM UTC')! },
        },
      ],
    });

    expect(activity.map((item) => item.kind)).toContain('job');
    expect(activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'job',
          subtype: 'job-applied',
          text: 'Applied to CTO at Divio',
        }),
        expect.objectContaining({
          kind: 'account',
          subtype: 'account-email-update',
          text: 'Updated email address: joe@example.com',
          status: 'primary · confirmed',
        }),
        expect.objectContaining({
          kind: 'security',
          subtype: 'security-login',
          targetName: 'Login',
          loginIp: '2001:db8::1',
        }),
        expect.objectContaining({
          kind: 'search',
          text: 'Searched for “staff engineer”',
        }),
        expect.objectContaining({
          kind: 'account',
          subtype: 'account-receipt',
          text: 'Premium Business',
          receiptSubTotal: '0.00',
          receiptTaxAmount: '0.00',
          receiptTotalAmount: '0.00',
          receiptCurrency: 'SEK',
        }),
      ]),
    );
  });

  it('includes message and learning events in the activity stream', () => {
    const activity = makeActivities({
      ownerName: 'Joe Smith',
      shares: [],
      richMedia: [],
      comments: [],
      reactions: [],
      votes: [],
      reposts: [],
      messages: [
        {
          __row: 0,
          FROM: 'Joe Smith',
          TO: 'Emma Taylor',
          DATE: '2025-12-16 08:00:14 UTC',
          CONTENT: 'Can we move our call to tomorrow at 3?',
          'RECIPIENT PROFILE URLS': 'https://www.linkedin.com/in/emma-taylor-0305',
          __dates: { DATE: parseTemporalValue('2025-12-16 08:00:14 UTC')! },
        },
      ],
      learning: [
        {
          __row: 1,
          'Content Title': 'SQL for Data Analysis',
          'Content Description':
            '<p>Master SQL <b>queries</b>, joins, and <i>window functions</i>.</p>',
          'Content Type': 'Course',
          'Content Last Watched Date (if viewed)': '2025-10-18 18:52 UTC',
          'Content Completed At (if completed)': 'N/A',
          'Content Saved': 'false',
          __dates: {
            'Content Last Watched Date (if viewed)': parseTemporalValue('2025-10-18 18:52 UTC')!,
          },
        },
      ],
    });

    expect(activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'message',
          subtype: 'message-sent',
          text: 'To Emma Taylor: Can we move our call to tomorrow at 3?',
          eyebrow: 'Sent message',
          href: 'https://www.linkedin.com/in/emma-taylor-0305',
        }),
        expect.objectContaining({
          kind: 'learning',
          text: 'Viewed course: SQL for Data Analysis',
          eyebrow: 'Learning viewed',
          learningDescription:
            '<p>Master SQL <b>queries</b>, joins, and <i>window functions</i>.</p>',
        }),
      ]),
    );
  });

  it('counts endorsements and parses website links', () => {
    const counts = endorsementCounts([
      { __row: 0, 'Skill Name': 'React' },
      { __row: 1, 'Skill Name': 'React' },
      { __row: 2, 'Skill Name': 'TypeScript' },
    ]);

    expect(counts.get('React')).toBe(2);
    expect(parseWebsites('[BLOG:https://example.com]')).toEqual([
      { label: 'Blog', href: 'https://example.com' },
    ]);
    expect(
      parseWebsites('[PERSONAL:https://www.alexewerlof.com,BLOG:https://blog.alexewerlof.com]'),
    ).toEqual([
      { label: 'Personal', href: 'https://www.alexewerlof.com' },
      { label: 'Blog', href: 'https://blog.alexewerlof.com' },
    ]);
  });

  it('removes LinkedIn export quote wrappers from display text', () => {
    expect(displayText('"A quoted line"\n""\nPlain line')).toBe('A quoted line\n\nPlain line');
  });

  it('formats company follow timestamps through the shared temporal formatter', () => {
    const raw = 'Mon Apr 25 07:27:31 UTC 2011';
    const temporal = parseTemporalValue(raw);

    expect(temporal).toMatchObject({ precision: 'date-time', zone: 'utc' });
    expect(formatRowTemporal({ __row: 0, 'Followed On': raw }, 'Followed On')).toBe(
      formatTemporal(temporal, raw),
    );
  });
});
