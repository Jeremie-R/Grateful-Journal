import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SpecialsSchema = z.array(z.string()).max(8);

export const listEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("entries")
      .select("id, mood, specials, gratitude, note, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getEntry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("entries")
      .select("id, mood, specials, gratitude, note, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const SaveSchema = z.object({
  id: z.string().optional(),
  mood: z.number().int().min(0).max(4).nullable(),
  specials: SpecialsSchema,
  gratitude: z.string().max(4000).nullable(),
  note: z.string().max(4000).nullable(),
  created_at: z.string().datetime().optional(),
});

export const saveEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      mood: data.mood,
      specials: data.specials,
      gratitude: data.gratitude,
      note: data.note,
      ...(data.created_at ? { created_at: data.created_at } : {}),
    };

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("entries")
        .update(payload)
        .eq("id", data.id)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }

    const { data: row, error } = await context.supabase
      .from("entries")
      .insert({ ...payload, user_id: context.userId })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("entries")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAllEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("entries")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
