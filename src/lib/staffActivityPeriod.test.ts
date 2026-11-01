import { describe, expect, it } from 'vitest';
import { staffActivityStart } from './staffActivityPeriod';

describe('staff calendar periods in Karachi', () => {
  it('today excludes yesterday rather than using a rolling 24 hours', () => {
    expect(staffActivityStart(1, new Date('2026-11-01T08:10:00Z'))).toBe('2026-10-31T19:00:00.000Z');
  });
  it('today switches at Karachi midnight', () => {
    expect(staffActivityStart(1, new Date('2026-11-01T19:00:00Z'))).toBe('2026-11-01T19:00:00.000Z');
  });
  it('seven days include today and six earlier calendar days', () => {
    expect(staffActivityStart(7, new Date('2026-11-01T08:10:00Z'))).toBe('2026-10-25T19:00:00.000Z');
  });
});