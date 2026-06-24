# Gratefulness Journal — Build Plan

A simple, calming daily gratefulness journal optimized for mobile. Color comes only from the 5 emotions (pastel pink, purple, blue, yellow, green); everything else is greyscale-to-black on soft off-white. Accounts use email magic-link sign-in via Lovable Cloud, so entries sync across devices.

## Design language

- **Palette:** neutral base (off-white background, charcoal/grey text and chrome). Emotion colors are the only saturated hues:
  - Sad → pastel pink, Mild → pastel purple, Average → pastel blue, Okay → pastel yellow, Good → pastel green.
- **Faces:** each mood is a soft colored circle with a single mouth line at a different angle (heavy-down → flat → heavy-up).
- **Type:** a warm, rounded modern sans (soft, feminine, not Inter/Poppins) for everything.
- **Feel:** generous whitespace, gentle rounded "quirky" shapes for date chips, soft shadows, subtle blurred color halos.

## Navigation

Bottom bar with three simple icons: **Journal** (list) · **Create entry** (center, prominent +) · **History** (chart). Tapping + opens the entry editor for *today*.

## Pages

### 1. Journal (`/`)
- Light, unobtrusive top row: month quick-nav (jump to previous months) + a search button (search by date or note text).
- One-column "schedule" view, newest first:
  - **Left:** quirky-shaped chip with day number + 3-letter day name, shown once per day.
  - **Right:** stacked entry cards for that day. Card background = the entry's emotion color; shows selected "special" icons, then the gratitude text, then a muted subtext for the extra note.
- Each month gets a styled separator.
- Tap a card → open editor in edit mode.

### 2. Entry editor (`/entry` for today, `/entry/$id` to edit)
All four inputs optional; can save with any/none filled.
- **How do you feel today?** 5 circular face emojis + a slider centered at the middle that maps to the 5 levels. Selecting one highlights it and fades the others; a soft top halo of the chosen color appears behind the page.
- **What was special about today?** Multi-select of 8 icon-only buttons: Weather, Night, Game, Nature, Sport, Energy, Food, Friends.
- **Something to be grateful for:** textarea pre-filled with "I am grateful for".
- **Something more:** free textarea.
- Actions: **Save** confirms; exit discards. In edit mode, a small grey **Delete** button.

### 3. History (`/history`)
Top toggle: **Last 30 days · Last year · About you**.
- **Last 30 days:** full-screen stacked color bands (one per emotion) sized by % of entries, each labeled with its %; inside each band, the "special" icons most often paired with that emotion.
- **Last year:** stacked mood bar chart across the last 12 months; a pie chart of most-used "special" icons; then, per the 8 specials, a horizontal stacked bar of which emotions they co-occur with.
- **About you:** nickname (editable), start date, total entries, **AI summary** button (gentle reflective summary via Lovable AI), export entries, reset all data, delete account.

### Auth (`/auth`)
Email magic-link sign-in only. Authenticated routes live under `_authenticated/`; `/auth` is public.

## Technical notes

- **Lovable Cloud** enabled for database + auth (magic link) + AI summary. (No Supabase naming shown to users.)
- **Data model:**
  - `profiles` (user_id, nickname, created_at) — auto-created on signup via trigger; RLS scoped to `auth.uid()`.
  - `entries` (id, user_id, mood smallint 0–4 nullable, specials text[], gratitude text, note text, created_at, updated_at) — RLS scoped to `auth.uid()`.
  - Every table gets explicit GRANTs + RLS policies in the same migration.
- **Mood:** stored as 5 discrete levels (0–4).
- **Routing:** TanStack file routes — `index.tsx` (Journal), `history.tsx`, `entry.tsx` + `entry.$id.tsx`, `auth.tsx`, under the managed `_authenticated/` gate where sign-in is required.
- **Data access:** reads/writes via `createServerFn` with `requireSupabaseAuth`; TanStack Query for caching.
- **AI summary:** server function calling Lovable AI Gateway (`google/gemini-3-flash-preview`); `LOVABLE_API_KEY` stays server-side.
- **Charts:** Recharts for the year view; the 30-day band view is custom CSS.
- **Icons:** lucide-react (cloud, moon, gamepad, leaf, activity, zap, utensils, users, etc.).
- **Export:** client-side JSON/CSV download of the user's entries.
- **Fonts:** installed via @fontsource; emotion color tokens added to `src/styles.css`.

## Build order

1. Enable Lovable Cloud; create migration (profiles, entries, RLS, grants, signup trigger).
2. Set up design tokens, fonts, mood/specials shared config, bottom nav, and `_authenticated` shell + `/auth`.
3. Entry editor with mood faces/slider, specials, textareas, save/delete server functions.
4. Journal schedule view (grouping, month separators, search, month nav).
5. History: 30-day bands, last-year charts, About you (stats, export, reset, delete) + AI summary function.
6. Verify flows end-to-end (sign in, create, edit, delete, history) in the preview.

Open the entry editor as the primary action; the user never picks a date — it's always today unless editing an existing entry.