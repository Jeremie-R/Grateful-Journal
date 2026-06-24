import { useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Heart } from "lucide-react";
import { listEntries } from "@/lib/entries.functions";
import {
  MOODS,
  moodSoftColor,
  specialByKey,
  type JournalEntry,
} from "@/lib/journal";
import { MoodFace } from "@/components/MoodFace";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated/")({
  component: JournalPage,
});

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DayGroup {
  dayKey: string;
  date: Date;
  entries: JournalEntry[];
}
interface MonthGroup {
  monthKey: string;
  label: string;
  days: DayGroup[];
}

function groupEntries(entries: JournalEntry[]): MonthGroup[] {
  const months = new Map<string, MonthGroup>();
  for (const entry of entries) {
    const d = new Date(entry.created_at);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    const dayKey = `${monthKey}-${d.getDate()}`;
    let month = months.get(monthKey);
    if (!month) {
      month = {
        monthKey,
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        days: [],
      };
      months.set(monthKey, month);
    }
    let day = month.days.find((x) => x.dayKey === dayKey);
    if (!day) {
      day = { dayKey, date: d, entries: [] };
      month.days.push(day);
    }
    day.entries.push(entry);
  }
  return Array.from(months.values());
}

function JournalPage() {
  const fetchEntries = useServerFn(listEntries);
  const { data, isLoading } = useQuery({
    queryKey: ["entries"],
    queryFn: () => fetchEntries(),
  });

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const entries = (data ?? []) as JournalEntry[];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const d = new Date(e.created_at);
      const dateStr = `${d.getDate()} ${MONTH_NAMES[d.getMonth()].toLowerCase()} ${d.getFullYear()} ${DAY_NAMES[d.getDay()].toLowerCase()}`;
      return (
        dateStr.includes(q) ||
        (e.gratitude ?? "").toLowerCase().includes(q) ||
        (e.note ?? "").toLowerCase().includes(q) ||
        e.specials.some((s) => (specialByKey(s)?.label ?? "").toLowerCase().includes(q))
      );
    });
  }, [entries, query]);

  const months = useMemo(() => groupEntries(filtered), [filtered]);
  const allMonths = useMemo(() => groupEntries(entries), [entries]);

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-5">
      {/* Header */}
      <header className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-1.5 text-2xl font-bold tracking-tight">
          <Heart className="h-5 w-5" fill="currentColor" /> Journal
        </h1>
        <button
          onClick={() => {
            setSearchOpen((v) => !v);
            if (searchOpen) setQuery("");
          }}
          aria-label="Search"
          className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground/70 transition-colors hover:text-foreground"
        >
          {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </button>
      </header>

      {searchOpen && (
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a date or a word…"
          className="mb-4 w-full rounded-2xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-ring"
        />
      )}

      {/* Month quick-nav */}
      {!searchOpen && allMonths.length > 1 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {allMonths.map((m) => (
            <button
              key={m.monthKey}
              onClick={() =>
                monthRefs.current[m.monthKey]?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="shrink-0 rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {m.label.replace(/ \d{4}$/, "")}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-secondary/60" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : months.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">
          Nothing matches “{query}”.
        </p>
      ) : (
        <div className="space-y-6">
          {months.map((month) => (
            <div
              key={month.monthKey}
              ref={(el) => {
                monthRefs.current[month.monthKey] = el;
              }}
              className="scroll-mt-4"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {month.label}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-4">
                {month.days.map((day) => (
                  <DayRow key={day.dayKey} day={day} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function DayRow({ day }: { day: DayGroup }) {
  return (
    <div className="flex gap-3">
      {/* Date chip */}
      <div className="flex w-14 shrink-0 flex-col items-center pt-1">
        <div className="grid h-14 w-14 place-items-center rounded-[1.4rem] rounded-tr-md bg-secondary">
          <span className="text-xl font-bold leading-none">{day.date.getDate()}</span>
          <span className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            {DAY_NAMES[day.date.getDay()]}
          </span>
        </div>
      </div>

      {/* Stacked entries */}
      <div className="min-w-0 flex-1 space-y-2.5">
        {day.entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function EntryCard({ entry }: { entry: JournalEntry }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate({ to: "/entry/$id", params: { id: entry.id } })}
      className="block w-full rounded-3xl p-4 text-left transition-transform active:scale-[0.99]"
      style={{ backgroundColor: moodSoftColor(entry.mood) }}
    >
      <div className="flex items-center gap-2">
        {entry.mood != null && (
          <MoodFace level={entry.mood as 0 | 1 | 2 | 3 | 4} size={26} />
        )}
        {entry.specials.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {entry.specials.map((s) => {
              const def = specialByKey(s);
              if (!def) return null;
              const Icon = def.icon;
              return (
                <span
                  key={s}
                  className="grid h-6 w-6 place-items-center rounded-full bg-foreground/5 text-foreground/70"
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              );
            })}
          </div>
        )}
      </div>

      {entry.gratitude?.trim() && (
        <p className="mt-2.5 text-[0.95rem] font-medium leading-snug text-foreground">
          {entry.gratitude}
        </p>
      )}
      {entry.note?.trim() && (
        <p className="mt-1 line-clamp-2 text-sm text-foreground/55">{entry.note}</p>
      )}
      {!entry.gratitude?.trim() && !entry.note?.trim() && entry.mood != null && (
        <p className="mt-2 text-sm text-foreground/50">
          Feeling {MOODS[entry.mood].label.toLowerCase()}.
        </p>
      )}
    </button>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="mt-20 flex flex-col items-center text-center">
      <div className="mb-5 flex items-center gap-1.5">
        {[0, 2, 4].map((l) => (
          <MoodFace key={l} level={l as 0 | 2 | 4} size={40} />
        ))}
      </div>
      <h2 className="text-lg font-semibold">Start your first entry</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Take a quiet moment to note something you're grateful for today.
      </p>
      <button
        onClick={() => navigate({ to: "/entry" })}
        className="mt-5 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Write today's entry
      </button>
    </div>
  );
}
