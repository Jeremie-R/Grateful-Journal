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

/* ---------- Recently ---------- */
function MonthView({ entries }: { entries: JournalEntry[] }) {
  const linePoints = useMemo(() => lastNEntriesMoods(entries, 12), [entries]);
  const weights = useMemo(() => recentMoodWeights(entries, 14), [entries]);
  const specials = useMemo(() => recentSpecialCounts(entries, 14), [entries]);

  const hasAnything =
    linePoints.length > 0 || weights.length > 0 || specials.length > 0;
  if (!hasAnything) {
    return <Empty text="Nothing logged recently yet. Add an entry to see your vibe." />;
  }

  return (
    <div className="space-y-10">
      <MoodLine points={linePoints} />
      <MoodMesh weights={weights} />
      <MomentBubbles specials={specials} />
    </div>
  );
}

/* ---- Element width hook for the responsive SVG line ---- */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ---- 1. Emotional line chart (no axes, colored by mood value) ---- */
function MoodLine({ points }: { points: { level: number; token: string; created_at: string }[] }) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const height = 150;

  if (points.length < 2) {
    return (
      <div ref={ref} className="grid h-[150px] place-items-center text-center">
        <p className="max-w-xs text-sm text-muted-foreground">
          Log a couple more moods to see your emotional trend.
        </p>
      </div>
    );
  }

  const padX = 16;
  const padY = 22;
  const w = width || 320;
  const innerW = Math.max(1, w - padX * 2);
  const innerH = height - padY * 2;

  const coords = points.map((p, i) => {
    const x = padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    // level 0 (sad) at bottom, level 4 (good) at top
    const y = padY + (1 - p.level / 4) * innerH;
    return { x, y, token: p.token };
  });

  // Smooth path via Catmull-Rom -> cubic bezier
  const d = smoothPath(coords);

  return (
    <div ref={ref} className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} aria-hidden>
        <defs>
          <linearGradient id="moodLineGrad" x1="0" y1="0" x2="1" y2="0">
            {coords.map((c, i) => (
              <stop
                key={i}
                offset={`${(i / (coords.length - 1)) * 100}%`}
                stopColor={`var(--mood-${c.token})`}
              />
            ))}
          </linearGradient>
        </defs>
        <g style={{ filter: "saturate(1.6)" }}>
          <path
            d={d}
            fill="none"
            stroke="url(#moodLineGrad)"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={5}
            fill={`var(--mood-${c.token})`}
            stroke="var(--card)"
            strokeWidth={2}
          />
        ))}
      </svg>
    </div>
  );
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  const line = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return { len: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) };
  };
  const controlPoint = (
    cur: { x: number; y: number },
    prev: { x: number; y: number } | undefined,
    next: { x: number; y: number } | undefined,
    reverse?: boolean,
  ) => {
    const p = prev ?? cur;
    const n = next ?? cur;
    const smoothing = 0.18;
    const o = line(p, n);
    const angle = o.angle + (reverse ? Math.PI : 0);
    const length = o.len * smoothing;
    return { x: cur.x + Math.cos(angle) * length, y: cur.y + Math.sin(angle) * length };
  };
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cps = controlPoint(pts[i - 1], pts[i - 2], pts[i]);
    const cpe = controlPoint(pts[i], pts[i - 1], pts[i + 1], true);
    d += ` C ${cps.x} ${cps.y} ${cpe.x} ${cpe.y} ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

/* ---- 2. Mood "mesh" — Apple Card style blurred blend (last 14 days) ---- */
const MESH_POS: Record<number, { x: number; y: number }> = {
  0: { x: 22, y: 28 }, // sad — top-left
  1: { x: 78, y: 24 }, // mild — top-right
  2: { x: 50, y: 52 }, // average — center
  3: { x: 26, y: 78 }, // okay — bottom-left
  4: { x: 76, y: 76 }, // good — bottom-right
};

function MoodMesh({ weights }: { weights: { level: number; token: string; share: number }[] }) {
  if (weights.length === 0) {
    return (
      <div className="grid h-[200px] place-items-center rounded-2xl bg-secondary/60 text-center">
        <p className="max-w-xs text-sm text-muted-foreground">
          No moods logged in the last two weeks.
        </p>
      </div>
    );
  }

  const layers = weights
    .slice()
    .sort((a, b) => b.share - a.share)
    .map((w) => {
      const pos = MESH_POS[w.level] ?? { x: 50, y: 50 };
      const radius = 30 + w.share * 55; // larger share -> larger glow
      return `radial-gradient(circle at ${pos.x}% ${pos.y}%, var(--mood-${w.token}) 0%, transparent ${radius}%)`;
    })
    .join(", ");

  return (
    <div className="relative h-[200px] overflow-hidden rounded-2xl shadow-sm">
      <div
        className="absolute -inset-8"
        style={{ background: layers, filter: "blur(38px) saturate(1.15)" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 120%, rgba(255,255,255,0.18), transparent 60%)" }}
      />
    </div>
  );
}

/* ---- 3. Overlapping moment bubbles (last 14 days) ---- */
function MomentBubbles({ specials }: { specials: { key: string; label: string; count: number }[] }) {
  if (specials.length === 0) {
    return (
      <div className="grid h-[160px] place-items-center text-center">
        <p className="max-w-xs text-sm text-muted-foreground">
          No moments noted in the last two weeks.
        </p>
      </div>
    );
  }

  const maxCount = specials[0].count;
  const GOLDEN = 2.399963229728653;
  const raw = specials.map((s, i) => {
    const r = 26 + 26 * Math.sqrt(s.count / maxCount);
    if (i === 0) return { ...s, x: 0, y: 0, r, shade: 0 };
    const dist = 1.55 * Math.sqrt(i) * 30;
    return {
      ...s,
      x: Math.cos(i * GOLDEN) * dist,
      y: Math.sin(i * GOLDEN) * dist,
      r,
      shade: i,
    };
  });

  const minX = Math.min(...raw.map((b) => b.x - b.r));
  const maxX = Math.max(...raw.map((b) => b.x + b.r));
  const minY = Math.min(...raw.map((b) => b.y - b.r));
  const maxY = Math.max(...raw.map((b) => b.y + b.r));
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const height = 220;

  return (
    <div className="relative w-full" style={{ height }}>
      {raw.map((b) => {
        const shadeIdx = Math.min(b.shade, MOMENT_BLUE.length - 1);
        const fill = MOMENT_BLUE[shadeIdx];
        const iconColor = shadeIdx < 2 ? "#ffffff" : "#3f3f46";
        const def = specialByKey(b.key);
        const Icon = def?.icon;
        const left = `calc(50% + ${b.x - (minX + boxW / 2)}px)`;
        const top = `calc(50% + ${b.y - (minY + boxH / 2)}px)`;

        return (
          <div
            key={b.key}
            className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-sm"
            style={{
              left,
              top,
              width: b.r * 2,
              height: b.r * 2,
              background: fill,
            }}
            title={`${b.label} · ${b.count}`}
          >
            {Icon && <Icon style={{ width: b.r * 0.8, height: b.r * 0.8, color: iconColor }} />}
          </div>
        );
      })}
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
