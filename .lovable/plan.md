# Add to Home Screen — banner + button

## Goal
On mobile, show a small, friendly banner on the home screen that encourages adding **Grateful** to the phone's home screen. It appears **once per user account** (dismissable), and is hidden forever after the user dismisses it or once the app is already installed. Also add a permanent **"Add to home screen"** button in the *About you* section, directly under *Export my entries*, that re-opens the same install instructions on demand.

## Where things live today
- Home screen: `src/routes/_authenticated/index.tsx`
- *About you* tab (with *Export my entries*): inside `src/routes/_authenticated/history.tsx`
- Profile read/write server functions: `src/lib/profile.functions.ts`
- PWA manifest + iOS meta tags: already configured in `src/routes/__root.tsx`

## 1. Persist "seen" state per account (database)
Add one column to the `profiles` table so the dismissed state follows the user across devices:

```text
homescreen_prompt_dismissed  boolean  not null  default false
```

Done via a migration (no new GRANTs needed — `profiles` already grants the needed privileges and has user-scoped RLS).

## 2. Backend wiring (`src/lib/profile.functions.ts`)
- Extend `getProfile`'s `select(...)` to include `homescreen_prompt_dismissed` (and the same in `updateNickname`'s return so the cache stays consistent).
- Add a new `dismissHomescreenPrompt` server function (`requireSupabaseAuth`) that sets `homescreen_prompt_dismissed = true` for the current user and returns the updated row.

## 3. Shared install helper + instructions component
Create `src/components/AddToHomeScreen.tsx` containing:
- A small `useIsInstallable()` helper that detects:
  - mobile (touch / small viewport via `matchMedia`),
  - whether the app is **already** running standalone (`navigator.standalone` on iOS or `display-mode: standalone`) — if installed, suppress everything.
- An `InstallInstructionsSheet` (a lightweight bottom sheet / modal styled with existing tokens — card, rounded-3xl, charcoal-on-off-white, no new accent colors) that explains the steps. Because iOS Safari has no programmatic install prompt, the copy gives the tap-by-tap path: **Share → Add to Home Screen**. On Android/Chrome, if a `beforeinstallprompt` event was captured, show a native **Install** button; otherwise show the same menu instructions.

## 4. Home-screen banner (`src/routes/_authenticated/index.tsx`)
- Read the profile via TanStack Query (`["profile"]`, same key already used in History).
- Render a small dismissable banner at the top of the journal list **only when all are true**: on mobile, not already installed, and `profile.homescreen_prompt_dismissed === false`.
- Banner: compact rounded card with the app heart mark, one line like *"Add Grateful to your home screen for one-tap journaling"*, an **Add** action (opens the instructions sheet) and an **×** dismiss.
- Dismissing (the × or completing via the sheet) calls `dismissHomescreenPrompt`, then invalidates `["profile"]` so it never returns for that account.

## 5. "Add to home screen" button in About you (`history.tsx`)
- Add a new `ActionRow` with a phone/download-style icon labeled **"Add to home screen"**, placed immediately under the existing *Export my entries* row.
- Clicking it opens the same `InstallInstructionsSheet`. This is always available (it does not depend on the dismissed flag), so users who dismissed the banner can still find it.
- On desktop this row can stay visible (instructions note it's a phone feature) — keeping it simple and avoiding conditional clutter.

## Notes / constraints
- Manifest-only PWA is already set up; no service worker, no offline behavior, no new caching — consistent with current setup.
- No new colors: banner and sheet use existing greyscale/charcoal tokens only.
- The dismissed state is per account (stored in `profiles`), as requested.

## Technical summary
- Migration: `ALTER TABLE public.profiles ADD COLUMN homescreen_prompt_dismissed boolean NOT NULL DEFAULT false;`
- `profile.functions.ts`: include new column in selects; add `dismissHomescreenPrompt` server fn.
- New `src/components/AddToHomeScreen.tsx`: install detection helper + instructions sheet (reused by banner and About button).
- `index.tsx`: conditional banner gated on mobile + not-installed + not-dismissed; wired to `["profile"]` query and dismiss mutation.
- `history.tsx`: new `ActionRow` under *Export my entries* opening the instructions sheet.
- Regenerate Supabase types after the migration so `homescreen_prompt_dismissed` is typed.
