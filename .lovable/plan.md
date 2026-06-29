# History redesign — "Recently" & "Over time"

Rework the History page (`src/routes/_authenticated/history.tsx`) toggle labels and rebuild the first tab around three softer, more "vibe"-driven visuals. The "Over time" tab keeps its existing charts.

## Toggle renaming

In the segmented toggle:
- `Last 30 days` → **Recently**
- `Last year` → **Over time**
- `About you` stays unchanged.

The internal tab keys (`month`, `year`, `about`) stay the same; only the labels change. The yearly view content is untouched.

## "Recently" tab — three stacked elements

Replaces the current full-screen percentage bands (`MonthView`). New top-to-bottom layout, each in a soft `rounded-lg` card matching the rest of the page.

### 1. Emotional line chart (last 12 entries)

A smooth line showing mood across the **last 12 entries** (most recent on the right), where Y = mood level 0–4.

- **No axes, no grid, no labels** — just the line on a clean card.
- The line is colored **by mood value**: each point sits on the emotion palette (pink=sad → green=good), and the stroke blends smoothly between consecutive points using a gradient along the path. So a stretch of good days reads green, dipping toward pink on harder days.
- Small soft dots at each entry point, tinted to that entry's mood.
- Entries with no mood logged are skipped (line connects logged moods only).
- If fewer than 2 mood entries exist, show a gentle empty state.

```text
   ·green
  /        ·yellow
 ·blue   /
      \ /
   ·pink
 (no numbers, no grid)
```

### 2. Mood "mesh" blend (last 14 days) — Apple Card vibe

Replaces the percentage bands with a **soft blurred gradient rectangle** where the mood colors melt into each other, weighted by how often each mood appeared in the **last 14 days**.

- A rounded rectangle (~ 200px tall) filled with several large, heavily-blurred radial-gradient blobs, one per mood present.
- Each mood's blobs use its `--mood-*` color; **blob size/opacity scales with that mood's share** of the last 14 days, so a mostly-calm fortnight glows green, a mixed one swirls multi-color.
- Blob positions are deterministic per mood (seeded from the mood level) so it's stable between renders but evolves naturally as the 14-day window shifts.
- Implemented with layered CSS radial gradients + a heavy `blur()` filter and subtle grain/overlay — no detailed percentages shown, purely atmospheric. No external library needed.
- Empty state if no moods in the last 14 days.

### 3. Overlapping moment bubbles (last 14 days)

A cluster of **overlapping circles**, one per "special/moment" chosen in the **last 14 days**.

- Bubble **size scales with how often** that moment was selected in the window.
- Bubbles use the **pastel blue scale** (reuse `MOMENT_BLUE`), darker shades for the most-used moments, lighter for the rest; white icons on the two darkest, charcoal on lighter ones (same contrast rule as the donut).
- Each bubble shows the moment's Lucide icon centered.
- Bubbles **overlap softly** in a packed cluster (deterministic spiral packing in plain JS — largest in the center, others spiraling out and overlapping slightly), giving an organic clustered look rather than a grid.
- Empty state if no moments logged in the last 14 days.

## Technical notes

- All changes are presentation-only inside `src/routes/_authenticated/history.tsx`; no schema, server-fn, or data-model changes.
- New analytics helpers in `src/lib/analytics.ts`:
  - `lastNEntriesMoods(entries, n)` → ordered list of `{ level, token, created_at }` for the line.
  - `recentMoodWeights(entries, days)` → per-mood share over the window for the mesh.
  - `recentSpecialCounts(entries, days)` → per-special counts over the window for the bubbles.
- The line gradient uses an SVG `<linearGradient>` with stops at each point's mood color, applied as the path stroke (pure SVG, no chart lib needed; Recharts isn't a good fit for per-segment color so this is hand-rolled SVG).
- Mesh uses inline `style` with stacked `radial-gradient(...)` layers + `filter: blur(...)`; bubble packing is a small deterministic function returning `{x, y, r}` per bubble, positioned absolutely in a fixed-height container.
- Color rule respected: saturated color still comes only from the mood palette (line + mesh); bubbles use the already-approved blue moment palette.
- The `MonthView` component is replaced; `YearView`, `AboutView`, and all other behavior stay intact.

## Out of scope

- No changes to the Journal page, entry editor, auth, or the "Over time"/"About you" tab contents (beyond the label rename).
