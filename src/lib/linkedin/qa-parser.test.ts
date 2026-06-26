import { describe, expect, it } from 'vitest';
import { parseQAPairs } from './qa-parser';

describe('parseQAPairs', () => {
  it('returns an empty array for empty input', () => {
    expect(parseQAPairs('')).toEqual([]);
    expect(parseQAPairs('   ')).toEqual([]);
  });

  it('parses a single simple pair', () => {
    const result = parseQAPairs('First name:Alice');
    expect(result).toEqual([{ question: 'First name', answer: 'Alice' }]);
  });

  it('parses multiple pairs separated by " | "', () => {
    const input =
      'First name:Alice | Last name:Smith | Email address:alice@example.com | Are you 18 years or older?:Yes';
    expect(parseQAPairs(input)).toEqual([
      { question: 'First name', answer: 'Alice' },
      { question: 'Last name', answer: 'Smith' },
      { question: 'Email address', answer: 'alice@example.com' },
      { question: 'Are you 18 years or older?', answer: 'Yes' },
    ]);
  });

  it('handles answers that contain colons', () => {
    // Dates and times often contain colons
    const input = 'Dates of employment:2024-01-15 | School: | Degree:';
    const result = parseQAPairs(input);
    expect(result).toEqual([
      { question: 'Dates of employment', answer: '2024-01-15' },
      { question: 'School', answer: '' },
      { question: 'Degree', answer: '' },
    ]);
  });

  it('handles questions that end with a period before the colon', () => {
    // Some LinkedIn questions have trailing periods
    const input = 'I agree to the privacy policy.:I consent';
    expect(parseQAPairs(input)).toEqual([
      { question: 'I agree to the privacy policy.', answer: 'I consent' },
    ]);
  });

  it('handles experience-related dropdown fields', () => {
    const input = 'How many years of experience do you have?:5+ Years | Salary expectation:';
    expect(parseQAPairs(input)).toEqual([
      { question: 'How many years of experience do you have?', answer: '5+ Years' },
      { question: 'Salary expectation', answer: '' },
    ]);
  });

  it('handles multi-word question keys separated by slashes', () => {
    const input = 'Do you have the legal authorization to work in this country?:Yes';
    expect(parseQAPairs(input)).toEqual([
      {
        question: 'Do you have the legal authorization to work in this country?',
        answer: 'Yes',
      },
    ]);
  });

  it('handles Description fields with bullet points', () => {
    const input =
      'Description:• Led migration from legacy to cloud-native • Established architecture decision process | Company:Acme Inc';
    const result = parseQAPairs(input);
    expect(result).toEqual([
      {
        question: 'Description',
        answer:
          '• Led migration from legacy to cloud-native • Established architecture decision process',
      },
      { question: 'Company', answer: 'Acme Inc' },
    ]);
  });

  it('handles notice period and management experience fields', () => {
    const input =
      'What is your notice period?:4 - 8 weeks | How many people have you managed?:50+ Employees';
    expect(parseQAPairs(input)).toEqual([
      { question: 'What is your notice period?', answer: '4 - 8 weeks' },
      { question: 'How many people have you managed?', answer: '50+ Employees' },
    ]);
  });

  it('handles language proficiency fields', () => {
    const input = 'How would you describe your English language level?:C2 Mastery';
    expect(parseQAPairs(input)).toEqual([
      {
        question: 'How would you describe your English language level?',
        answer: 'C2 Mastery',
      },
    ]);
  });

  it('handles titles that contain parentheses', () => {
    const input = 'Your title:Staff Engineer (Platform) | Company:Volvo Cars';
    expect(parseQAPairs(input)).toEqual([
      { question: 'Your title', answer: 'Staff Engineer (Platform)' },
      { question: 'Company', answer: 'Volvo Cars' },
    ]);
  });

  it('handles multi-paragraph descriptions separated by the pipe', () => {
    const input =
      'Description:• First bullet • Second bullet | Dates of employment:2020-01-01 - 2022-06-01 | Company:Startup Inc';
    const result = parseQAPairs(input);
    expect(result).toHaveLength(3);
    const first = result[0]!;
    expect(first.question).toBe('Description');
    expect(first.answer).toContain('• First bullet');
    expect(result[1]).toEqual({
      question: 'Dates of employment',
      answer: '2020-01-01 - 2022-06-01',
    });
    expect(result[2]).toEqual({ question: 'Company', answer: 'Startup Inc' });
  });

  it('handles a row with no colon', () => {
    const input = 'Some free text answer';
    expect(parseQAPairs(input)).toEqual([{ question: '', answer: 'Some free text answer' }]);
  });
});
