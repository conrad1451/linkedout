import { describe, expect, it } from 'vitest';
import {
  inferLinkedInProfileInfo,
  linkedInProfileInfoFromUrl,
  linkedInProfileIntroEditUrl,
  linkedInProfileSectionUrl,
  linkedInProfileSummaryEditUrl,
} from './profile';

describe('LinkedIn profile helpers', () => {
  it('infers the active member profile from invitations', () => {
    const profile = inferLinkedInProfileInfo([
      {
        schemaId: 'profile',
        rows: [{ 'First Name': 'Joe', 'Last Name': 'Smith' }],
      },
      {
        schemaId: 'invitations',
        rows: [
          {
            From: 'Joe Smith',
            To: 'Maya Smith',
            Direction: 'OUTGOING',
            inviterProfileUrl: 'https://www.linkedin.com/in/joe-smith',
            inviteeProfileUrl: 'https://www.linkedin.com/in/maya-smith-0001',
          },
        ],
      },
    ]);

    expect(profile).toEqual({
      username: 'joe-smith',
      url: 'https://www.linkedin.com/in/joe-smith',
    });
  });

  it('infers the active member profile from message sender and recipient URLs', () => {
    const profile = inferLinkedInProfileInfo([
      {
        schemaId: 'profile',
        rows: [{ 'First Name': 'Joe', 'Last Name': 'Smith' }],
      },
      {
        schemaId: 'messages',
        rows: [
          {
            FROM: 'Emma Taylor',
            'SENDER PROFILE URL': 'https://www.linkedin.com/in/emma-taylor-0305',
            TO: 'Joe Smith',
            'RECIPIENT PROFILE URLS': 'www.linkedin.com/in/joe-smith',
          },
          {
            FROM: 'Joe Smith',
            'SENDER PROFILE URL': 'https://www.linkedin.com/in/joe-smith/',
            TO: 'Emma Taylor',
            'RECIPIENT PROFILE URLS': 'https://www.linkedin.com/in/emma-taylor-0305',
          },
        ],
      },
    ]);

    expect(profile?.username).toBe('joe-smith');
  });

  it('builds LinkedIn profile section edit URLs', () => {
    const profile = linkedInProfileInfoFromUrl(
      'www.linkedin.com/in/joe-smith?miniProfileUrn=ignored',
    );

    expect(linkedInProfileSectionUrl(profile, 'experience')).toBe(
      'https://www.linkedin.com/in/joe-smith/details/experience/',
    );
    expect(linkedInProfileSectionUrl(profile, 'education')).toBe(
      'https://www.linkedin.com/in/joe-smith/details/education/',
    );
    expect(linkedInProfileSectionUrl(profile, 'courses')).toBe(
      'https://www.linkedin.com/in/joe-smith/details/courses/',
    );
    expect(linkedInProfileSectionUrl(profile, 'honors')).toBe(
      'https://www.linkedin.com/in/joe-smith/details/honors/',
    );
    expect(linkedInProfileSectionUrl(profile, 'languages')).toBe(
      'https://www.linkedin.com/in/joe-smith/details/languages/',
    );
    expect(linkedInProfileSectionUrl(profile, 'recommendations')).toBe(
      'https://www.linkedin.com/in/joe-smith/details/recommendations/',
    );
    expect(linkedInProfileIntroEditUrl(profile)).toBe(
      'https://www.linkedin.com/in/joe-smith/edit/intro',
    );
    expect(linkedInProfileSummaryEditUrl(profile)).toBe(
      'https://www.linkedin.com/in/joe-smith/edit/forms/summary/new/',
    );
  });
});
