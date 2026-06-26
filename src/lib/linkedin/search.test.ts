import { describe, expect, it } from 'vitest';
import { linkedInHashtagSearchUrl } from './search';

describe('LinkedIn search helpers', () => {
  it('builds LinkedIn hashtag search URLs', () => {
    expect(linkedInHashtagSearchUrl('#ai')).toBe(
      'https://www.linkedin.com/search/results/all/?keywords=%23ai&origin=HASH_TAG_FROM_FEED',
    );
    expect(linkedInHashtagSearchUrl('machinelearning')).toBe(
      'https://www.linkedin.com/search/results/all/?keywords=%23machinelearning&origin=HASH_TAG_FROM_FEED',
    );
  });

  it('does not build a hashtag search URL for blank input', () => {
    expect(linkedInHashtagSearchUrl('   ')).toBeUndefined();
    expect(linkedInHashtagSearchUrl('#')).toBeUndefined();
  });
});
