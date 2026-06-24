import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, nickname, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    // Ensure a profile exists (defensive — trigger normally handles this)
    if (!data) {
      const { data: created, error: createErr } = await context.supabase
        .from("profiles")
        .insert({ user_id: context.userId })
        .select("id, nickname, created_at")
        .maybeSingle();
      if (createErr) throw new Error(createErr.message);
      return created;
    }
    return data;
  });

export const updateNickname = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ nickname: z.string().max(60).nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("profiles")
      .update({ nickname: data.nickname })
      .eq("user_id", context.userId)
      .select("id, nickname, created_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Cascades to profiles and entries via ON DELETE CASCADE
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
