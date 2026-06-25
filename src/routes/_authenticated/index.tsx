import { useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X, Heart } from "lucide-react";
import { listEntries } from "@/lib/entries.functions";
import { getProfile, dismissHomescreenPrompt } from "@/lib/profile.functions";
import {
  MOODS,
  moodSoftColor,
  specialByKey,
  type JournalEntry,
} from "@/lib/journal";
import { MoodFace } from "@/components/MoodFace";
import { BottomNav } from "@/components/BottomNav";
import {
  InstallInstructionsSheet,
  useIsInstallable,
} from "@/components/AddToHomeScreen";

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

      <HomeScreenBanner />


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
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/60" />
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

function HomeScreenBanner() {
  const installable = useIsInstallable();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getProfile);
  const dismiss = useServerFn(dismissHomescreenPrompt);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const dismissMutation = useMutation({
    mutationFn: () => dismiss(),
    onMutate: () => {
      queryClient.setQueryData(
        ["profile"],
        (prev: Record<string, unknown> | null | undefined) =>
          prev ? { ...prev, homescreen_prompt_dismissed: true } : prev,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  if (!installable || !profile || profile.homescreen_prompt_dismissed) {
    return null;
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-sm">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-foreground">
          <Heart className="h-5 w-5" fill="currentColor" />
        </span>
        <button
          onClick={() => setSheetOpen(true)}
          className="min-w-0 flex-1 text-left text-sm font-medium leading-snug"
        >
          Add Grateful to your home screen for one-tap journaling.
        </button>
        <button
          onClick={() => setSheetOpen(true)}
          className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Add
        </button>
        <button
          onClick={() => dismissMutation.mutate()}
          aria-label="Dismiss"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-foreground/40 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <InstallInstructionsSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          dismissMutation.mutate();
        }}
      />
    </>
  );
}

function DayRow({ day }: { day: DayGroup }) {
  return (
    <div className="flex gap-3">
      {/* Date chip */}
      <div className="flex w-16 shrink-0 flex-col items-center pt-1">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg
            viewBox="0 0 172 166"
            className="absolute inset-0 h-full w-full text-secondary"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M30.597 20.5986C47.0083 2.36748 71.2537 -4.06074 91.5003 2.51169C97.5395 4.47212 103.95 5.43234 110.271 4.83868C122.8 3.6621 134.877 6.22597 145.086 13.0313C162.401 24.5736 170.52 45.7697 169.044 69.3021C168.781 73.4905 169.326 77.6917 170.369 81.7566C171.988 88.0652 172.422 94.5866 171.502 101.154C168.395 123.335 150.59 140.77 126.091 149.052C123.556 149.909 121.123 151.063 118.858 152.49C95.4772 167.215 68.933 169.816 49.2982 156.728C43.4658 152.84 38.6771 147.856 34.9468 142.057C32.567 138.358 29.6994 134.963 26.2497 132.234C7.89994 117.715 -2.39327 97.679 0.475901 77.1963C1.79012 67.8147 5.73353 59.2819 11.7007 51.9316C14.5697 48.3975 16.8821 44.4241 18.5212 40.1773C21.2038 33.2273 25.2286 26.5624 30.597 20.5986Z" />
          </svg>
          <div className="relative flex flex-col items-center justify-center">
            <span className="text-xl font-bold leading-none">{day.date.getDate()}</span>
            <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
              {DAY_NAMES[day.date.getDay()]}
            </span>
          </div>
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
  const hasBody = !!entry.gratitude?.trim() || !!entry.note?.trim();
  const moodLabel = entry.mood != null ? MOODS[entry.mood].label : null;
  return (
    <button
      onClick={() => navigate({ to: "/entry/$id", params: { id: entry.id } })}
      aria-label={!hasBody && moodLabel ? `Feeling ${moodLabel.toLowerCase()}` : undefined}
      className="block w-full rounded-lg p-4 text-left transition-transform active:scale-[0.99]"
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
