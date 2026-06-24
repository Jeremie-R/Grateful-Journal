# Fixing the email DNS so login codes send

## What's actually wrong

Your login-code (magic-link) emails are sent from the subdomain `notify.grateful.app.roberrini.com`. For that to work, you delegated this subdomain to Lovable's nameservers by adding two `NS` records at OVH.

The problem is in how OVH saved those `NS` values. The intended values are:

```text
ns7.lovable.cloud
ns8.lovable.cloud
```

But OVH stored them as:

```text
ns7.lovable.cloud.roberrini.com
ns8.lovable.cloud.roberrini.com
```

This is the classic OVH "missing trailing dot" trap: when an `NS` value is entered **without a trailing dot**, OVH treats it as a name *relative to your zone* and appends `.roberrini.com`. Those `ns7.lovable.cloud.roberrini.com` / `ns8.lovable.cloud.roberrini.com` hosts don't exist, so they have no A/AAAA records — which is exactly the anomaly OVH reported. Result: the subdomain never delegates to Lovable, DNS verification stays "Pending," and no email (including login codes) goes out.

This is a DNS change at your registrar (OVH). I can't edit your OVH zone from here, so this part has to be done by you — but it's a 2-minute fix.

## What you need to do at OVH

1. Log in to OVH → your domain `roberrini.com` → **DNS zone**.
2. Find the two `NS` records for the subdomain `notify.grateful.app` (they currently show targets ending in `ns7.lovable.cloud.roberrini.com` and `ns8.lovable.cloud.roberrini.com`).
3. Edit each one so the target is the **fully qualified name with a trailing dot**:

```text
ns7.lovable.cloud.
ns8.lovable.cloud.
```

The trailing dot is the important part — it tells OVH "this is the complete name, don't append my domain."

4. Save / deploy the zone. OVH should stop reporting the "no address records" anomaly once the targets are correct.

```text
Subdomain:  notify.grateful.app   (i.e. notify.grateful.app.roberrini.com)
Type:       NS
Target 1:   ns7.lovable.cloud.    ← note the trailing dot
Target 2:   ns8.lovable.cloud.    ← note the trailing dot
```

## After the DNS fix

1. DNS changes can take anywhere from a few minutes up to 72 hours to propagate.
2. Once propagated, the email domain verifies automatically. You can re-check status in **Cloud → Emails** (and press Verify there if you want to nudge it).
3. When the domain shows verified, I'll confirm the email queue is healthy and we can send a test login code to make sure codes actually land in the inbox.

## What I'll do on my side

While DNS propagates, once you've made the OVH change I will:
- Re-check the email domain verification status.
- Confirm the auth-email queue and the magic-link template are wired correctly so that, the moment the domain verifies, login codes flow.

No code changes are needed for the fix itself — this is purely the OVH NS-record correction. Let me know once you've updated the records (or if OVH's interface won't let you add the trailing dot, tell me and I'll walk you through OVH's exact field behavior).