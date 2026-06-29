import { useMemo, useState, useRef, useLayoutEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";
import { Sparkles, Download, RotateCcw, Trash2, LogOut, Pencil, Check, Smartphone } from "lucide-react";
import { listEntries } from "@/lib/entries.functions";
import { getProfile, updateNickname, deleteAccount } from "@/lib/profile.functions";
import { generateReflection } from "@/lib/ai.functions";
import { deleteAllEntries } from "@/lib/entries.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  monthlyMoodBars, specialDistribution, specialMoodCorrelation,
  lastNEntriesMoods, recentMoodWeights, recentSpecialCounts,
} from "@/lib/analytics";
import { specialByKey, type JournalEntry } from "@/lib/journal";
import { MoodFace } from "@/components/MoodFace";
import { BottomNav } from "@/components/BottomNav";
import { InstallInstructionsSheet } from "@/components/AddToHomeScreen";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type Tab = "month" | "year" | "about";

function HistoryPage() {
  const fetchEntries = useServerFn(listEntries);
  const { data, isLoading } = useQuery({
    queryKey: ["entries"],
    queryFn: () => fetchEntries(),
  });
  const [tab, setTab] = useState<Tab>("month");
  const entries = (data ?? []) as JournalEntry[];

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-5">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">History</h1>

      <div className="mb-6 flex rounded-full bg-secondary p-1 text-sm font-medium">
        {([
          ["month", "Recently"],
          ["year", "Over time"],
          ["about", "About you"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-full px-2 py-2 transition-colors ${
              tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-72 animate-pulse rounded-2xl bg-secondary/60" />
      ) : tab === "month" ? (
        <MonthView entries={entries} />
      ) : tab === "year" ? (
        <YearView entries={entries} />
      ) : (
        <AboutView entries={entries} />
      )}

      <BottomNav />
    </div>
  );
}

/* ---------- Last 30 days ---------- */
function MonthView({ entries }: { entries: JournalEntry[] }) {
  const recent = useMemo(
    () => entries.filter((e) => new Date(e.created_at).getTime() >= Date.now() - 30 * 864e5),
    [entries],
  );
  const slices = useMemo(
    () => moodDistribution(recent).slice().sort((a, b) => b.level - a.level),
    [recent],
  );

  if (slices.length === 0) {
    return <Empty text="No moods logged in the last 30 days yet." />;
  }

  return (
    <div className="flex h-[calc(100dvh-12rem)] min-h-[24rem] flex-col overflow-hidden rounded-2xl shadow-sm">
      {slices.map((s) => (
        <div
          key={s.level}
          className="flex items-center justify-between px-5 py-3"
          style={{
            background: `var(--mood-${s.token})`,
            flexGrow: s.pct,
            flexBasis: 0,
            minHeight: 56,
          }}
        >
          <div className="flex items-center gap-3">
            <MoodFace level={s.level as 0 | 1 | 2 | 3 | 4} size={40} />
            <div className="text-2xl font-medium leading-none">{s.pct}%</div>
          </div>
          <div className="flex gap-1.5">
            {s.topSpecials.map((key) => {
              const def = specialByKey(key);
              if (!def) return null;
              const Icon = def.icon;
              return (
                <span
                  key={key}
                  className="grid h-8 w-8 place-items-center rounded-full bg-foreground/10 text-foreground/70"
                  title={def.label}
                >
                  <Icon className="h-4 w-4" />
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Last year ---------- */
const TOKEN_VAR: Record<string, string> = {
  sad: "var(--mood-sad)",
  mild: "var(--mood-mild)",
  avg: "var(--mood-avg)",
  okay: "var(--mood-okay)",
  good: "var(--mood-good)",
};

/* pastel deep blue palette for the "moments" donut, darkest -> lightest */
const MOMENT_BLUE = ["#93A5F3", "#A5B4F6", "#B7C3F8", "#C9D2FA", "#DBE1FB"];

interface MomentSlice {
  key: string;
  label: string;
  count: number;
  pct: number;
  fill: string;
  iconColor: string;
}

const RADIAN = Math.PI / 180;

function renderMomentIcon(props: {
  cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number;
  payload: MomentSlice;
}) {
  const { cx, cy, midAngle, innerRadius, outerRadius, payload } = props;
  const r = innerRadius + (outerRadius - innerRadius) / 2;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  const size = 16;
  const def = specialByKey(payload.key);
  if (!def) {
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={13} fill={payload.iconColor}>
        ⋯
      </text>
    );
  }
  const Icon = def.icon;
  return <Icon x={x - size / 2} y={y - size / 2} width={size} height={size} color={payload.iconColor} />;
}

function YearView({ entries }: { entries: JournalEntry[] }) {
  const bars = useMemo(() => monthlyMoodBars(entries), [entries]);
  const specials = useMemo(() => specialDistribution(entries), [entries]);
  const moments = useMemo<MomentSlice[]>(() => {
    const total = specials.reduce((sum, s) => sum + s.count, 0) || 1;
    const top = specials.slice(0, 4);
    const restCount = specials.slice(4).reduce((sum, s) => sum + s.count, 0);
    const arr: MomentSlice[] = top.map((s, i) => ({
      key: s.key,
      label: s.label,
      count: s.count,
      pct: Math.round((s.count / total) * 100),
      fill: MOMENT_BLUE[i],
      iconColor: i < 2 ? "#ffffff" : "#3f3f46",
    }));
    if (restCount > 0) {
      arr.push({
        key: "other",
        label: "Other",
        count: restCount,
        pct: Math.round((restCount / total) * 100),
        fill: MOMENT_BLUE[4],
        iconColor: "#3f3f46",
      });
    }
    return arr;
  }, [specials]);
  const correlation = useMemo(() => specialMoodCorrelation(entries), [entries]);


  const hasData = entries.some((e) => e.mood != null);
  if (!hasData) return <Empty text="Not enough entries yet to show yearly trends." />;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mood across the year
        </h2>
        <div className="rounded-lg bg-card p-3 shadow-sm">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bars} barCategoryGap="20%">
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <Tooltip cursor={{ fill: "var(--secondary)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
              <Bar dataKey="sad" stackId="m" fill={TOKEN_VAR.sad} />
              <Bar dataKey="mild" stackId="m" fill={TOKEN_VAR.mild} />
              <Bar dataKey="avg" stackId="m" fill={TOKEN_VAR.avg} />
              <Bar dataKey="okay" stackId="m" fill={TOKEN_VAR.okay} />
              <Bar dataKey="good" stackId="m" fill={TOKEN_VAR.good} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {moments.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your most noted moments
          </h2>
          <div className="rounded-lg bg-card p-3 shadow-sm">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={moments}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                  labelLine={false}
                  label={renderMomentIcon}
                >
                  {moments.map((s) => (
                    <Cell key={s.key} fill={s.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(_v, _n, item: { payload?: MomentSlice }) => [
                    `${item.payload?.pct}%`,
                    item.payload?.label,
                  ]}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}


      {correlation.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Moods behind each moment
          </h2>
          <div className="space-y-3 rounded-lg bg-card p-4 shadow-sm">
            {correlation.map((c) => {
              const Icon = specialByKey(c.key)!.icon;
              return (
                <div key={c.key} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-foreground/70">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex h-5 flex-1 overflow-hidden rounded-full bg-secondary">
                    {c.moods.map((m) =>
                      m.count > 0 ? (
                        <div
                          key={m.token}
                          style={{
                            width: `${(m.count / c.total) * 100}%`,
                            background: TOKEN_VAR[m.token],
                          }}
                        />
                      ) : null,
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------- About you ---------- */
function AboutView({ entries }: { entries: JournalEntry[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getProfile);
  const saveNickname = useServerFn(updateNickname);
  const reflect = useServerFn(generateReflection);
  const wipe = useServerFn(deleteAllEntries);
  const removeAccount = useServerFn(deleteAccount);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [installOpen, setInstallOpen] = useState(false);

  const nicknameMutation = useMutation({
    mutationFn: (nickname: string) => saveNickname({ data: { nickname: nickname || null } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditingName(false);
    },
  });

  const reflectMutation = useMutation({
    mutationFn: () => reflect(),
    onSuccess: (res) => {
      setAiError(null);
      setSummary(res.summary);
    },
    onError: (err) => setAiError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const resetMutation = useMutation({
    mutationFn: () => wipe(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      setSummary(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => removeAccount(),
    onSuccess: async () => {
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    },
  });

  function exportEntries() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grateful-entries-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const startDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: "long", day: "numeric", year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-6">
      {/* Nickname */}
      <div className="rounded-lg bg-card p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nickname
        </div>
        {editingName ? (
          <div className="mt-2 flex gap-2">
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="What should we call you?"
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-base outline-none focus:border-ring"
            />
            <button
              onClick={() => nicknameMutation.mutate(nameDraft.trim())}
              disabled={nicknameMutation.isPending}
              className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"
            >
              <Check className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-semibold">
              {profile?.nickname || "Friend"}
            </span>
            <button
              onClick={() => {
                setNameDraft(profile?.nickname ?? "");
                setEditingName(true);
              }}
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground/60 hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-card p-5 shadow-sm">
          <div className="text-2xl font-bold">{entries.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">entries written</div>
        </div>
        <div className="rounded-lg bg-card p-5 shadow-sm">
          <div className="text-2xl font-bold leading-tight">{startDate}</div>
          <div className="mt-1 text-xs text-muted-foreground">your journey began</div>
        </div>
      </div>

      {/* AI summary */}
      <div className="rounded-lg bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <h3 className="font-semibold">A gentle reflection</h3>
        </div>
        {summary ? (
          <p className="mt-3 text-sm leading-relaxed text-foreground/80">{summary}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Let AI look over your entries and share a kind, reflective summary.
          </p>
        )}
        {aiError && <p className="mt-2 text-sm text-destructive">{aiError}</p>}
        <button
          onClick={() => reflectMutation.mutate()}
          disabled={reflectMutation.isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {reflectMutation.isPending ? "Reflecting…" : summary ? "Refresh reflection" : "Generate reflection"}
        </button>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <ActionRow icon={Download} label="Export my entries" onClick={exportEntries} />
        <ActionRow icon={Smartphone} label="Add to home screen" onClick={() => setInstallOpen(true)} />
        <ActionRow icon={LogOut} label="Sign out" onClick={signOut} />
        <ActionRow
          icon={RotateCcw}
          label="Reset — delete all entries"
          danger
          onClick={() => {
            if (confirm("Delete ALL your entries? This can't be undone.")) resetMutation.mutate();
          }}
        />
        <ActionRow
          icon={Trash2}
          label="Delete my account"
          danger
          onClick={() => {
            if (confirm("Permanently delete your account and all data? This can't be undone.")) {
              deleteMutation.mutate();
            }
          }}
        />
      </div>

      <InstallInstructionsSheet open={installOpen} onClose={() => setInstallOpen(false)} />
    </div>
  );
}

function ActionRow({
  icon: Icon, label, onClick, danger,
}: {
  icon: typeof Download; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg bg-card px-5 py-3.5 text-left text-sm font-medium shadow-sm transition-colors hover:bg-secondary ${
        danger ? "text-destructive" : "text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="mb-4 flex gap-1.5">
        {[0, 2, 4].map((l) => (
          <MoodFace key={l} level={l as 0 | 2 | 4} size={32} />
        ))}
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
