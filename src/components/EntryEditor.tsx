import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Check, Trash2, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  MOODS,
  SPECIALS,
  GRATITUDE_PREFIX,
  moodColor,
  type JournalEntry,
  type MoodLevel,
} from "@/lib/journal";
import { MoodFace } from "@/components/MoodFace";
import { saveEntry, deleteEntry } from "@/lib/entries.functions";

interface EntryEditorProps {
  existing?: JournalEntry | null;
}

export function EntryEditor({ existing }: EntryEditorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const save = useServerFn(saveEntry);
  const remove = useServerFn(deleteEntry);

  const [mood, setMood] = useState<MoodLevel | null>(
    existing?.mood != null ? (existing.mood as MoodLevel) : null,
  );
  const [specials, setSpecials] = useState<string[]>(existing?.specials ?? []);
  const [gratitude, setGratitude] = useState<string>(
    existing?.gratitude != null && existing.gratitude.trim() !== ""
      ? existing.gratitude
      : GRATITUDE_PREFIX,
  );
  const [note, setNote] = useState<string>(existing?.note ?? "");
  const [entryDate, setEntryDate] = useState<Date>(
    () => new Date(existing?.created_at ?? Date.now()),
  );
  const [dateOpen, setDateOpen] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: existing?.id,
          mood,
          specials,
          gratitude:
            gratitude.trim() === "" || gratitude.trim() === GRATITUDE_PREFIX.trim()
              ? null
              : gratitude.trim(),
          note: note.trim() === "" ? null : note.trim(),
          created_at: entryDate.toISOString(),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      navigate({ to: "/" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => remove({ data: { id: existing!.id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      navigate({ to: "/" });
    },
  });

  function toggleSpecial(key: string) {
    setSpecials((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const todayLabel = entryDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function pickDate(d: Date | undefined) {
    if (!d) return;
    const next = new Date(d);
    next.setHours(
      entryDate.getHours(),
      entryDate.getMinutes(),
      entryDate.getSeconds(),
      entryDate.getMilliseconds(),
    );
    setEntryDate(next);
    setDateOpen(false);
  }

  return (
    <div className="relative min-h-screen">
      {/* Top blurred halo of the selected emotion color */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 transition-opacity duration-500"
        style={{
          opacity: mood != null ? 0.55 : 0,
          background:
            mood != null
              ? `radial-gradient(60% 100% at 50% 0%, ${moodColor(mood)} 0%, transparent 70%)`
              : "transparent",
        }}
      />

      <div className="relative z-10 mx-auto max-w-md px-4 pb-32 pt-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/" })}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-full bg-card/70 text-foreground/70 backdrop-blur transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                aria-label="Change date"
                className="inline-flex items-center gap-1.5 rounded-full bg-card/70 px-3 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
              >
                <CalendarIcon className="h-4 w-4" />
                {todayLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={entryDate}
                onSelect={pickDate}
                disabled={{ after: new Date() }}
                defaultMonth={entryDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <div className="w-10" />
        </div>

        {/* How do you feel */}
        <section className="mt-6">
          <h2 className="text-center text-xl font-bold">How do you feel?</h2>

          <div className="mt-6 flex items-end justify-between px-1">
            {MOODS.map((m) => (
              <MoodFace
                key={m.level}
                level={m.level}
                size={54}
                selected={mood === m.level}
                dimmed={mood != null && mood !== m.level}
                onClick={() => setMood(m.level)}
              />
            ))}
          </div>

        </section>

        {/* What was special */}
        <section className="mt-9">
          <h2 className="text-center text-xl font-bold">What is special about today?</h2>
          <div className="mt-5 grid grid-cols-5 gap-3">
            {SPECIALS.map((s) => {
              const Icon = s.icon;
              const active = specials.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => toggleSpecial(s.key)}
                  aria-label={s.label}
                  aria-pressed={active}
                  className={`grid aspect-square place-items-center rounded-2xl transition-all ${
                    active
                      ? "bg-primary text-primary-foreground scale-105 shadow-sm"
                      : "bg-secondary text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Gratitude */}
        <section className="mt-9">
          <h2 className="text-lg font-bold">Something to be grateful for</h2>
          <textarea
            value={gratitude}
            onChange={(e) => setGratitude(e.target.value)}
            onFocus={(e) => {
              // place caret at end when it starts with the prefix
              const v = e.target.value;
              e.target.setSelectionRange(v.length, v.length);
            }}
            rows={3}
            className="mt-3 w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-ring"
          />
        </section>

        {/* Something more */}
        <section className="mt-6">
          <h2 className="text-lg font-bold">Something more</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Any other thoughts…"
            className="mt-3 w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-ring"
          />
        </section>

        {existing && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" /> Delete entry
            </button>
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[max(env(safe-area-inset-bottom),1rem)]">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-60"
        >
          <Check className="h-5 w-5" />
          {saveMutation.isPending ? "Saving…" : existing ? "Save changes" : "Save entry"}
        </button>
      </div>
    </div>
  );
}
