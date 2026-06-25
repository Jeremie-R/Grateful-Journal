# Fix: Auth emails not sending

## What's wrong
Emails (magic link, signup) are correctly enqueued but are **never processed automatically**. They stay `pending` until the 15-minute TTL expires and then get dumped to the dead-letter queue — so users never receive them.

Diagnosis evidence:
- The four most recent emails were all `pending`; the three older ones had already aged out.
- Manually calling the processor route worked instantly: it **sent** the most recent magic link and moved the expired ones to DLQ. So the route, the email domain (verified), and the Lovable API key are all healthy.
- The scheduled trigger that hits the processor route every ~5 seconds is returning **403 Forbidden** — the service-role credential the scheduler presents no longer matches what the app expects (a stale credential after a key rotation).

Net: the only broken link is the automatic queue trigger's credential. This matches the timing ("stopped last night").

## The fix
1. **Refresh the email queue infrastructure** — re-run the managed email infrastructure setup. This is idempotent and re-provisions:
   - the `process-email-queue` scheduled job, and
   - the stored service-role credential it uses to call the processor route.
   This restores automatic sending without touching templates, the domain, or any app code.

## Verification
2. Send a real test magic-link sign-in to a test address and confirm the row in the send log transitions `pending -> sent` automatically (without any manual trigger), proving the scheduler is firing again.
3. Confirm no new emails are getting stuck in `pending` or landing in the DLQ.

## Notes
- The emails that already expired to the dead-letter queue (a couple of old signup/magic-link requests) cannot be resent retroactively — those users just need to request a fresh link, which will now work.
- No changes to templates, auth settings, Google sign-in, the sender domain, or any application code are required.

## Technical detail
- Root cause: pg_cron job `process-email-queue` calls `/lovable/email/queue/process` with a Bearer service-role token stored in Vault (`email_queue_service_role_key`). That stored token is stale relative to the current `SUPABASE_SERVICE_ROLE_KEY`, so the route's token check returns 403 and nothing is ever dequeued.
- Fix tool: `email_domain--setup_email_infra` (safe/idempotent; refreshes the Vault secret and cron job per the email infrastructure runbook). No migration or route edits needed.
