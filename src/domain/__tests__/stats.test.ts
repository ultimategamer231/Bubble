import {
  bestStreak,
  bubbleDays,
  currentStreak,
  formatSessionLength,
  formatTotal,
  lastSevenDays,
  summarize,
  totals,
  totalsForDay,
  type StatRow,
} from '../stats';
import { addDays, dayNumber, localDateOf, msUntilNextMidnight, weekdayOf } from '../time';

const MIN = 60_000;
const bubble = (localDate: string, minutes = 25): StatRow => ({
  type: 'FOCUS',
  status: 'COMPLETED',
  localDate,
  focusedMs: minutes * MIN,
});
const TODAY = '2026-11-16'; // a Monday

describe('A14 statistics', () => {
  it('today totals exclude breaks, cancelled and interrupted sessions', () => {
    const rows: StatRow[] = [
      bubble(TODAY, 25),
      bubble(TODAY, 50),
      { type: 'SHORT_BREAK', status: 'COMPLETED', localDate: TODAY, focusedMs: 5 * MIN },
      { type: 'LONG_BREAK', status: 'COMPLETED', localDate: TODAY, focusedMs: 15 * MIN },
      { type: 'FOCUS', status: 'CANCELLED', localDate: TODAY, focusedMs: 12 * MIN },
      { type: 'FOCUS', status: 'INTERRUPTED', localDate: TODAY, focusedMs: 9 * MIN },
      bubble('2026-11-15', 25),
    ];
    expect(totalsForDay(rows, TODAY)).toEqual({ sessions: 2, focusedMs: 75 * MIN });
    expect(totals(rows)).toEqual({ sessions: 3, focusedMs: 100 * MIN });
    expect(bubbleDays(rows)).toEqual(new Set([TODAY, '2026-11-15']));
  });

  it('floors minutes for display', () => {
    const rows = [{ ...bubble(TODAY), focusedMs: 25 * MIN + 59_999 }];
    expect(lastSevenDays(rows, TODAY)[6].minutes).toBe(25);
    expect(formatTotal(100 * MIN)).toBe('1 h 40 m');
    expect(formatTotal(25 * MIN + 59_000)).toBe('25 m');
    expect(formatTotal(0)).toBe('0 m');
    expect(formatTotal(61 * 60 * MIN + 20 * MIN)).toBe('61 h 20 m');
    expect(formatSessionLength(25 * MIN)).toBe('25 min');
    expect(formatSessionLength(60 * MIN)).toBe('1 h');
    expect(formatSessionLength(90 * MIN)).toBe('1 h 30 min');
    expect(formatSessionLength(10_000)).toBe('1 min');
  });

  it('7-day series ends today and is zero-filled', () => {
    const week = lastSevenDays(
      [bubble(TODAY, 45), bubble('2026-11-12', 30), bubble('2026-11-09')],
      TODAY,
    );
    expect(week.map((d) => d.dateKey)).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
    ]);
    expect(week.map((d) => d.minutes)).toEqual([0, 0, 30, 0, 0, 0, 45]);
    expect(week.map((d) => d.weekday)).toEqual([2, 3, 4, 5, 6, 0, 1]);
    expect(week.filter((d) => d.isToday).map((d) => d.dateKey)).toEqual([TODAY]);
    expect(week[6].sessions).toBe(1);
  });

  it('streak with a gap', () => {
    const days = new Set(['2026-11-16', '2026-11-15', '2026-11-14', '2026-11-12', '2026-11-11']);
    expect(currentStreak(days, TODAY)).toBe(3);
    expect(bestStreak(days)).toBe(3);
  });

  it('streak stays alive from yesterday while today is still empty', () => {
    const days = new Set(['2026-11-15', '2026-11-14']);
    expect(currentStreak(days, TODAY)).toBe(2);
    // …but not from the day before yesterday.
    expect(currentStreak(days, '2026-11-17')).toBe(0);
    expect(currentStreak(new Set(), TODAY)).toBe(0);
  });

  it('best streak finds the longest run, across month and year ends', () => {
    const days = new Set([
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-11-16',
    ]);
    expect(bestStreak(days)).toBe(4);
    expect(bestStreak(new Set())).toBe(0);
    expect(bestStreak(new Set([TODAY]))).toBe(1);
  });

  it('a session from 23:50 to 00:15 counts for the new day', () => {
    const tz = 60;
    const ended = Date.UTC(2026, 10, 16, 23, 15); // 00:15 on the 17th at UTC+1
    expect(localDateOf(ended, tz)).toBe('2026-11-17');
    expect(localDateOf(ended - 25 * MIN, tz)).toBe('2026-11-16');
    const days = new Set(['2026-11-16', localDateOf(ended, tz)]);
    expect(currentStreak(days, '2026-11-17')).toBe(2);
  });

  it('a timezone change never moves stored days', () => {
    // Recorded in Monrovia (UTC+0) late on the 15th; the user then flies east.
    const rows = [bubble(localDateOf(Date.UTC(2026, 10, 15, 23, 30), 0))];
    const todayInTokyo = localDateOf(Date.UTC(2026, 10, 16, 2, 0), 540);
    expect(rows[0].localDate).toBe('2026-11-15');
    expect(todayInTokyo).toBe('2026-11-16');
    const s = summarize(rows, todayInTokyo);
    expect(s.today.sessions).toBe(0);
    expect(s.currentStreak).toBe(1);
    expect(s.week[5]).toMatchObject({ dateKey: '2026-11-15', sessions: 1 });
  });

  it('summarize gathers everything for Insights, including the empty case', () => {
    expect(summarize([], TODAY)).toMatchObject({
      today: { sessions: 0, focusedMs: 0 },
      currentStreak: 0,
      bestStreak: 0,
      allTime: { sessions: 0, focusedMs: 0 },
    });
    const s = summarize([bubble(TODAY), bubble(TODAY), bubble('2026-11-15')], TODAY);
    expect(s).toMatchObject({
      today: { sessions: 2, focusedMs: 50 * MIN },
      currentStreak: 2,
      bestStreak: 2,
      allTime: { sessions: 3, focusedMs: 75 * MIN },
    });
  });
});

describe('calendar helpers', () => {
  it('local dates for positive and negative offsets', () => {
    const t = Date.UTC(2026, 10, 16, 2, 30);
    expect(localDateOf(t, 0)).toBe('2026-11-16');
    expect(localDateOf(t, -300)).toBe('2026-11-15');
    expect(localDateOf(t, 330)).toBe('2026-11-16');
    expect(localDateOf(Date.UTC(2026, 0, 1, 0, 0), -60)).toBe('2025-12-31');
  });

  it('adds days across month, year and leap boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(dayNumber('1970-01-02')).toBe(1);
    expect(weekdayOf('2026-11-16')).toBe(1);
  });

  it('time until the next local midnight', () => {
    expect(msUntilNextMidnight(Date.UTC(2026, 10, 16, 23, 59, 59), 0)).toBe(1000);
    expect(msUntilNextMidnight(Date.UTC(2026, 10, 16, 0, 0, 0), 0)).toBe(86_400_000);
    expect(msUntilNextMidnight(Date.UTC(2026, 10, 16, 22, 0, 0), 60)).toBe(3_600_000);
    expect(msUntilNextMidnight(Date.UTC(2026, 10, 16, 3, 0, 0), -300)).toBe(2 * 3_600_000);
  });
});
