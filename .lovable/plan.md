# Keep the phone logged in

## Why it's happening
The session client is already configured correctly (`persistSession: true`, `autoRefreshToken: true`, `localStorage`). The problem is iOS-specific:

- You opened the app from a **Home Screen icon**, which iOS runs as a *standalone web-clip* with its **own private storage**, isolated from the normal Safari browser.
- You sign in by pasting the magic link into the **Safari browser**, so the session lands in Safari's storage — the home-screen app never receives it.
- A site that isn't a real installable PWA also gets weaker, more easily-evicted storage on iOS.

## The fix (two parts)

### 1. Make Grateful a real installable app (manifest-only PWA)
This gives the home-screen instance a proper standalone container with durable storage, so a session saved there survives relaunches.

- Add `public/manifest.webmanifest` with `name`, `short_name` ("Grateful"), `display: "standalone"`, `start_url: "/"`, `theme_color`, `background_color`, and icon entries.
- Generate app icons (heart mark in the app's pastel/charcoal style) into `public/`: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, and `apple-touch-icon.png` (180×180).
- Add the matching head tags in `src/routes/__root.tsx` `head()`:
  - `link rel="manifest"` → `/manifest.webmanifest`
  - `link rel="apple-touch-icon"` → `/apple-touch-icon.png`
  - `meta name="apple-mobile-web-app-capable" content="yes"` (enables true standalone mode on iOS)
  - `meta name="apple-mobile-web-app-status-bar-style"`
  - `meta name="apple-mobile-web-app-title" content="Grateful"`
  - `meta name="theme-color"`

No service worker and no offline caching — per Lovable's PWA guidance, this is the minimal "Add to Home Screen" path, and service workers are deliberately avoided so previews don't break.

### 2. Steer mobile sign-in to the in-app code (so auth happens inside the app)
The current `/auth` screen already supports typing the emailed 6-digit code directly in the app — that path stores the session in whatever container you're in. We'll make that the obvious primary path on mobile so you never have to hop to a different browser:

- Reword the `/auth` copy to lead with "Enter the 6-digit code from the email" and present the magic link as secondary.
- Keep the existing code-entry form; just make it the prominent action.

## What you'll do once after this ships
1. Re-add the app to your Home Screen (so iOS picks up the new standalone manifest).
2. Open it from the icon, enter your email, then type the **6-digit code** from the email into the app (no need to open the link in another browser).
3. From then on the home-screen app should keep you signed in across launches.

## Notes / caveats
- iOS caches manifest fields at install time, so the one-time re-add above is needed to switch into true standalone mode.
- iOS can still evict storage after ~7 days of no use; installed standalone apps are treated more durably than plain bookmarks, so this is the most reliable option available to a web app. If you ever want sessions that survive even long gaps, the next step would be a native wrapper, which is a separate, larger effort.

## Technical details
- Files: new `public/manifest.webmanifest`, new icon PNGs in `public/`, edits to `src/routes/__root.tsx` (head tags) and `src/routes/auth.tsx` (copy/emphasis only).
- No changes to `src/integrations/supabase/client.ts` (already correct) and no auth/business-logic changes.