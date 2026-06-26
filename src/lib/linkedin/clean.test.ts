import { describe, expect, it } from 'vitest';
import { cleanShareCommentary } from './clean';

describe('cleanShareCommentary', () => {
  it('returns plain text unchanged', () => {
    expect(cleanShareCommentary('Hello world')).toBe('Hello world');
  });

  it('returns single-line post with genuine quotes unchanged', () => {
    expect(cleanShareCommentary('"What gets measured gets managed" — discuss.')).toBe(
      '"What gets measured gets managed" — discuss.',
    );
  });

  it('returns multi-line post without LinkedIn wrapping unchanged', () => {
    const input = 'Line one.\n\nLine two.\n\nLine three.';
    expect(cleanShareCommentary(input)).toBe(input);
  });

  it('preserves genuine quote-wrapped post with plain \\n\\n breaks', () => {
    // Test-data style: user typed genuine quotes, paragraph breaks are just \n\n
    const input = '"Reliability is a property."\n\nThree things I learned.';
    expect(cleanShareCommentary(input)).toBe(input);
  });

  it('strips LinkedIn paragraph wrapping from a two-paragraph post', () => {
    const input = 'First paragraph."\n""\n"Second paragraph.';
    const expected = 'First paragraph.\n\nSecond paragraph.';
    expect(cleanShareCommentary(input)).toBe(expected);
  });

  it('strips LinkedIn paragraph wrapping from a three-paragraph post', () => {
    const input = 'Para 1."\n""\n"Para 2."\n""\n"Para 3';
    const expected = 'Para 1.\n\nPara 2.\n\nPara 3';
    expect(cleanShareCommentary(input)).toBe(expected);
  });

  it('strips per-line wrapping within a multi-line paragraph', () => {
    // Within one paragraph group, multiple lines each have wrapping quotes
    const input =
      'Management is different."\n""\n"The former is position."\n"The latter is earned."\n""\n"Employees.';
    const expected =
      'Management is different.\n\nThe former is position.\nThe latter is earned.\n\nEmployees.';
    expect(cleanShareCommentary(input)).toBe(expected);
  });

  it('handles trailing paragraph separator with empty content', () => {
    // From the reliability post — last separator + trailing empty quoted line
    const input = 'How do you measure?"\n""\n"This setup is common."\n""\n"#tag "\n""\n"';
    const expected = 'How do you measure?\n\nThis setup is common.\n\n#tag ';
    expect(cleanShareCommentary(input)).toBe(expected);
  });

  it('preserves genuine quotes at line boundaries within a paragraph', () => {
    // After CSV parsing, a line with genuine quotes ""Hello," she said."
    // has: "" at start (wrapper + genuine), " before "she" (genuine),
    //      " at end (wrapper).  Four " chars total.
    const input = 'First."\n""\n""Hello," she said."\n""\n"Third.';
    const expected = 'First.\n\n"Hello," she said.\n\nThird.';
    expect(cleanShareCommentary(input)).toBe(expected);
  });

  it('handles the short cold-emails post pattern', () => {
    const input = 'Do you get cold emails? 🤣"\n""\n"Also 50%?! 🤯😅';
    const expected = 'Do you get cold emails? 🤣\n\nAlso 50%?! 🤯😅';
    expect(cleanShareCommentary(input)).toBe(expected);
  });

  it('handles the full first post pattern from user export', () => {
    const input =
      '😥 I have some sad news."\n""\n"Over the years, I learned a lot."\n""\n"#privacy';
    const expected = '😥 I have some sad news.\n\nOver the years, I learned a lot.\n\n#privacy';
    expect(cleanShareCommentary(input)).toBe(expected);
  });
});
