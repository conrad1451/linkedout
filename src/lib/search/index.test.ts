import { describe, expect, it } from 'vitest';
import { tokenizeSearchText } from './index';

describe('tokenizeSearchText', () => {
  it('normalizes case, punctuation, and diacritics', () => {
    expect(tokenizeSearchText('José Núñez, Reliability! reliability')).toEqual([
      'jose',
      'nunez',
      'reliability',
    ]);
  });
});
