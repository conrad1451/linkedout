import { describe, expect, it } from 'vitest';
import {
  fallbackSchemaForFile,
  findSchemaForFile,
  getSchemas,
  resolveSchemaForFile,
} from './index';

const KNOWN_FILES = [
  'Profile.csv',
  'Profile Summary.csv',
  'Positions.csv',
  'Shares.csv',
  'Comments.csv',
  'Reactions.csv',
  'messages.csv',
  'guide_messages.csv',
  'Connections.csv',
  'Invitations.csv',
  'ImportedContacts.csv',
  'Endorsement_Given_Info.csv',
  'Recommendations_Given.csv',
  'Member_Follows.csv',
  'Company Follows.csv',
  'Hashtag_Follows.csv',
  'Jobs/Job Applications.csv',
  'Jobs/Saved Jobs.csv',
  'Verifications/Verifications.csv',
  'Logins.csv',
  'SearchQueries.csv',
  'Ads Clicked.csv',
  'Ad_Targeting.csv',
  'Services Marketplace/Providers.csv',
];

describe('schema registry', () => {
  it('resolves every known LinkedIn export filename', () => {
    for (const file of KNOWN_FILES) {
      const schema = findSchemaForFile(file);
      expect(schema, `missing schema for ${file}`).toBeDefined();
    }
  });

  it('matches by basename when nested path differs', () => {
    expect(findSchemaForFile('Verifications/Verifications.csv')?.id).toBe('verifications');
    expect(findSchemaForFile('Profile.csv')?.id).toBe('profile');
  });

  it('produces a fallback schema for unknown files', () => {
    const schema = fallbackSchemaForFile('Surprise/Unknown File.csv');
    expect(schema.id).toBe('raw-unknown-file');
    expect(schema.category).toBe('other');
    expect(schema.title).toBe('Unknown File');
  });

  it('resolveSchemaForFile prefers a known schema over the fallback', () => {
    expect(resolveSchemaForFile('Comments.csv').id).toBe('comments');
    expect(resolveSchemaForFile('Mystery.csv').id).toBe('raw-mystery');
  });

  it('maps moved network datasets to their new destinations', () => {
    expect(resolveSchemaForFile('ImportedContacts.csv').category).toBe('privacy');
    expect(resolveSchemaForFile('Endorsement_Given_Info.csv').category).toBe('dashboard');
    expect(resolveSchemaForFile('Recommendations_Given.csv').category).toBe('profile');
    expect(resolveSchemaForFile('Email Addresses.csv').category).toBe('privacy');
    expect(resolveSchemaForFile('Registration.csv').category).toBe('privacy');
  });

  it('uses unique dataset ids across the registry', () => {
    const ids = getSchemas().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('handles filenames with trailing numeric suffixes', () => {
    expect(findSchemaForFile('Comments_91029461.csv')?.id).toBe('comments');
    expect(findSchemaForFile('Reactions_91029461.csv')?.id).toBe('reactions');
    expect(findSchemaForFile('Shares_91029461.csv')?.id).toBe('shares');
    expect(findSchemaForFile('Member_Follows_91029461.csv')?.id).toBe('member-follows');
  });
});
