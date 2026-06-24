import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Test/admin login bypass.
 *
 * Given the configured ADMIN_TEST_EMAIL + ADMIN_TEST_CODE (stored as server
 * secrets), this signs in to a dedicated test account without the magic-link
 * email flow. The account is created/confirmed on first use. The returned
 * session tokens are set client-side via supabase.auth.setSession.
 *
 * Security: this is gated entirely by the secret ADMIN_TEST_CODE, which acts
 * as a password. Only the configured email can be signed into.
 */
export const devLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; code: string }) => ({
    email: String(data.email ?? "").trim().toLowerCase(),
    code: String(data.code ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    const expectedEmail = (process.env.ADMIN_TEST_EMAIL ?? "").trim().toLowerCase();
    const expectedCode = (process.env.ADMIN_TEST_CODE ?? "").trim();

    if (!expectedEmail || !expectedCode) {
      throw new Error("Test login is not configured.");
    }

    // Both email and code must match the configured admin credentials.
    if (data.email !== expectedEmail || data.code !== expectedCode) {
      throw new Error("Invalid test credentials.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ensure the test user exists and is confirmed, with a known password.
    const password = `pw_${expectedCode}`;

    // Try to find an existing user by listing (admin getUserByEmail isn't typed here).
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const existing = list?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === expectedEmail,
    );

    if (existing) {
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
    } else {
      const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: expectedEmail,
        password,
        email_confirm: true,
      });
      if (createErr) throw new Error(createErr.message);
    }

    // Sign in with a session-less publishable client to mint a session.
    const supabasePublic = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: signIn, error: signInErr } =
      await supabasePublic.auth.signInWithPassword({
        email: expectedEmail,
        password,
      });

    if (signInErr || !signIn.session) {
      throw new Error(signInErr?.message ?? "Could not sign in test account.");
    }

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  });
