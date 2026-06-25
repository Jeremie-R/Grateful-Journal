# Magic-link login + Sign in with Google

Two changes: strip the 6-digit code flow back to a clean magic-link experience, and add a "Continue with Google" button using Lovable-managed Google OAuth (no secret needed).

## 1. Revert to magic-link-only login

**Sign-in page (`src/routes/auth.tsx`)**
- Remove the code-entry state and `verifyCode` flow (the `code`, `verifying` state and the OTP-verify form).
- Keep `signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })` — this is what sends the magic link.
- Replace the "Enter your code" success screen with a calm "Check your inbox" confirmation: tells the user we emailed a sign-in link to `{email}`, with a "Use a different email" button to go back.
- Update button/helper copy from "Email me a sign-in code" → "Email me a sign-in link", and remove the "6-digit code" wording.
- Leave the hidden Test login bypass untouched.

**Magic-link email (`src/lib/email-templates/magic-link.tsx`)**
- Remove the optional code block (the `Or enter this code` section), leaving just the "Sign in" button. Email becomes link-only.

## 2. Add Sign in with Google (Lovable-managed)

- Enable the Google provider through Lovable Cloud's managed OAuth (no client ID/secret required — your uploaded credentials aren't needed for this path). This also generates the `@/integrations/lovable` helper module.
- Add a "Continue with Google" button at the top of the sign-in card, with a subtle "or" divider above the email field. On click it calls:
  ```ts
  lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })
  ```
  handling the `redirected` / `error` results per the standard pattern.
- Users can sign in with **either** Google or a magic link; email/password stays off.

## Note on last night's email outage
The magic link sends through the same email pipeline as before, so if the sending domain is still verifying, link delivery can still lag. Google sign-in is unaffected — it bypasses email entirely, so it doubles as a reliable fallback while DNS finishes verifying. After these changes I'll send a test magic link and confirm Google works.

## Technical details
- `supabase--configure_social_auth` with `providers: ["google"]` (managed broker; do not hand-edit `src/integrations/lovable`).
- Google OAuth `redirect_uri` stays `window.location.origin` (public, same-origin) — never a protected route.
- No DB or RLS changes. The uploaded `client_secret_*.json` is not stored in the repo or used (managed path chosen).
