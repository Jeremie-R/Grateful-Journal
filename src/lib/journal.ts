import {
  Cloud,
  Moon,
  Gamepad2,
  Leaf,
  Bike,
  Zap,
  Utensils,
  Users,
  type LucideIcon,
} from "lucide-react";

export type MoodLevel = 0 | 1 | 2 | 3 | 4;

export interface MoodDef {
  level: MoodLevel;
  key: string;
  label: string;
  /** tailwind token name suffix, e.g. "sad" -> bg-mood-sad */
  token: "sad" | "mild" | "avg" | "okay" | "good";
  /** mouth curvature from -1 (frown / sad) to 1 (smile / happy) */
  curve: number;
}

export const MOODS: MoodDef[] = [
  { level: 0, key: "sad", label: "Sad", token: "sad", curve: -1 },
  { level: 1, key: "mild", label: "Mild", token: "mild", curve: -0.5 },
  { level: 2, key: "average", label: "Average", token: "avg", curve: 0 },
  { level: 3, key: "okay", label: "Okay", token: "okay", curve: 0.5 },
  { level: 4, key: "good", label: "Good", token: "good", curve: 1 },
];

export function moodByLevel(level: number | null | undefined): MoodDef | null {
  if (level == null) return null;
  return MOODS.find((m) => m.level === level) ?? null;
}

/** CSS var for a mood background (the saturated emotion color) */
export function moodColor(level: number | null | undefined): string {
  const m = moodByLevel(level);
  return m ? `var(--mood-${m.token})` : "var(--muted)";
}

/** CSS var for the soft tinted background variant */
export function moodSoftColor(level: number | null | undefined): string {
  const m = moodByLevel(level);
  return m ? `var(--mood-${m.token}-soft)` : "var(--muted)";
}

export interface SpecialDef {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const SPECIALS: SpecialDef[] = [
  { key: "weather", label: "Weather", icon: Cloud },
  { key: "night", label: "Night", icon: Moon },
  { key: "game", label: "Game", icon: Gamepad2 },
  { key: "nature", label: "Nature", icon: Leaf },
  { key: "sport", label: "Sport", icon: Bike },
  { key: "energy", label: "Energy", icon: Zap },
  { key: "food", label: "Food", icon: Utensils },
  { key: "friends", label: "Friends", icon: Users },
];

export function specialByKey(key: string): SpecialDef | undefined {
  return SPECIALS.find((s) => s.key === key);
}

export const GRATITUDE_PREFIX = "I am grateful for ";

export interface JournalEntry {
  id: string;
  mood: number | null;
  specials: string[];
  gratitude: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}
