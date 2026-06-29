import { MOODS, SPECIALS, type JournalEntry } from "@/lib/journal";

export function withinDays(entries: JournalEntry[], days: number): JournalEntry[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((e) => new Date(e.created_at).getTime() >= cutoff);
}

const MOOD_TOKENS = ["sad", "mild", "avg", "okay", "good"] as const;

export interface MoodPoint {
  level: number;
  token: string;
  created_at: string;
}

/**
 * The last `n` entries that have a mood logged, ordered oldest -> newest
 * (so the most recent sits on the right of the line chart).
 */
export function lastNEntriesMoods(entries: JournalEntry[], n: number): MoodPoint[] {
  return entries
    .filter((e) => e.mood != null)
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-n)
    .map((e) => ({
      level: e.mood as number,
      token: MOOD_TOKENS[e.mood as number],
      created_at: e.created_at,
    }));
}

/**
 * All mood points logged within the last `days`, ordered oldest -> newest
 * (so the most recent sits on the right of the line chart).
 */
export function recentMoodPoints(entries: JournalEntry[], days: number): MoodPoint[] {
  return withinDays(entries, days)
    .filter((e) => e.mood != null)
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((e) => ({
      level: e.mood as number,
      token: MOOD_TOKENS[e.mood as number],
      created_at: e.created_at,
    }));
}

export interface MoodWeight {
  level: number;
  token: string;
  share: number; // 0..1
}

/** Per-mood share over the last `days`, only moods that appear, by level asc. */
export function recentMoodWeights(entries: JournalEntry[], days: number): MoodWeight[] {
  const recent = withinDays(entries, days).filter((e) => e.mood != null);
  const total = recent.length || 1;
  return MOODS.map((m) => {
    const count = recent.filter((e) => e.mood === m.level).length;
    return { level: m.level, token: m.token, share: count / total };
  }).filter((w) => w.share > 0);
}

export interface RecentSpecial {
  key: string;
  label: string;
  count: number;
}

/** Per-special counts over the last `days`, descending, only those present. */
export function recentSpecialCounts(entries: JournalEntry[], days: number): RecentSpecial[] {
  const recent = withinDays(entries, days);
  return SPECIALS.map((s) => ({
    key: s.key,
    label: s.label,
    count: recent.filter((e) => e.specials.includes(s.key)).length,
  }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

export interface MoodSlice {
  level: number;
  token: string;
  label: string;
  count: number;
  pct: number;
  /** specials most correlated with this mood, by key */
  topSpecials: string[];
}

export function moodDistribution(entries: JournalEntry[]): MoodSlice[] {
  const withMood = entries.filter((e) => e.mood != null);
  const total = withMood.length || 1;

  return MOODS.map((m) => {
    const ofMood = withMood.filter((e) => e.mood === m.level);
    const specialCounts = new Map<string, number>();
    for (const e of ofMood) {
      for (const s of e.specials) {
        specialCounts.set(s, (specialCounts.get(s) ?? 0) + 1);
      }
    }
    const topSpecials = Array.from(specialCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    return {
      level: m.level,
      token: m.token,
      label: m.label,
      count: ofMood.length,
      pct: Math.round((ofMood.length / total) * 100),
      topSpecials,
    };
  })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MonthBar {
  label: string;
  sad: number;
  mild: number;
  avg: number;
  okay: number;
  good: number;
}

/** last 12 months, oldest -> newest */
export function monthlyMoodBars(entries: JournalEntry[]): MonthBar[] {
  const now = new Date();
  const bars: MonthBar[] = [];
  const buckets = new Map<string, MonthBar>();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bar: MonthBar = {
      label: MONTH_SHORT[d.getMonth()],
      sad: 0, mild: 0, avg: 0, okay: 0, good: 0,
    };
    buckets.set(key, bar);
    bars.push(bar);
  }

  const tokens = ["sad", "mild", "avg", "okay", "good"] as const;
  for (const e of entries) {
    if (e.mood == null) continue;
    const d = new Date(e.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bar = buckets.get(key);
    if (bar) bar[tokens[e.mood]] += 1;
  }
  return bars;
}

export interface SpecialSlice {
  key: string;
  label: string;
  count: number;
}

export function specialDistribution(entries: JournalEntry[]): SpecialSlice[] {
  return SPECIALS.map((s) => ({
    key: s.key,
    label: s.label,
    count: entries.filter((e) => e.specials.includes(s.key)).length,
  }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

export interface SpecialMoodStack {
  key: string;
  label: string;
  total: number;
  moods: { token: string; level: number; count: number }[];
}

/** For each special, the distribution of moods assigned alongside it */
export function specialMoodCorrelation(entries: JournalEntry[]): SpecialMoodStack[] {
  return SPECIALS.map((s) => {
    const rel = entries.filter((e) => e.specials.includes(s.key) && e.mood != null);
    const moods = MOODS.map((m) => ({
      token: m.token,
      level: m.level,
      count: rel.filter((e) => e.mood === m.level).length,
    }));
    return { key: s.key, label: s.label, total: rel.length, moods };
  }).filter((s) => s.total > 0);
}
