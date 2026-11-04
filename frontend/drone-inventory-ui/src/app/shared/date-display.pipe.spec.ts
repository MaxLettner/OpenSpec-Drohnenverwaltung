import { DateDisplayPipe } from './date-display.pipe';

describe('DateDisplayPipe', () => {
  const pipe = new DateDisplayPipe();

  it('formats an ISO date as dd.MM.yyyy', () => {
    expect(pipe.transform('2026-11-04')).toBe('04.11.2026');
  });

  it('keeps leap days and month ends', () => {
    expect(pipe.transform('2024-02-29')).toBe('29.02.2024');
    expect(pipe.transform('2026-12-31')).toBe('31.12.2026');
  });

  it('returns an empty string for null and undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it.each([
    '',
    'not-a-date',
    '04.11.2026',
    '2026-1-4',
    '2026-11-04T10:00:00Z',
    '2026-13-01',
    '2026-00-10',
    '2026-11-00',
    '2026-02-30',
    '2025-02-29',
  ])('returns an empty string for invalid input %j', (value) => {
    expect(pipe.transform(value)).toBe('');
  });
});
