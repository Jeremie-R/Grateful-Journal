import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const MOOD_LABELS = ["Sad", "Mild", "Average", "Okay", "Good"];

export const generateReflection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const { data: entries, error } = await context.supabase
      .from("entries")
      .select("mood, specials, gratitude, note, created_at")
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) throw new Error(error.message);

    if (!entries || entries.length === 0) {
      return {
        summary:
          "You haven't written any entries yet. Once you add a few, I'll gently reflect on the patterns in your gratitude and mood here.",
      };
    }

    const lines = entries
      .map((e) => {
        const mood = e.mood != null ? MOOD_LABELS[e.mood] : "—";
        const date = new Date(e.created_at).toISOString().slice(0, 10);
        const specials = (e.specials ?? []).join(", ") || "—";
        const grat = e.gratitude?.trim() || "—";
        const note = e.note?.trim() || "";
        return `• ${date} | mood: ${mood} | special: ${specials} | grateful: ${grat}${note ? ` | note: ${note}` : ""}`;
      })
      .join("\n");

    const gateway = createLovableAiGatewayProvider(key);

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system:
          "You are a warm, gentle journaling companion. Given a person's gratitude journal entries, write a short, encouraging reflection (3-5 sentences). Highlight recurring sources of gratitude, gentle mood patterns, and what seems to bring them joy. Be kind and personal, never clinical. Do not give medical advice. Address the reader as 'you'.",
        prompt: `Here are my recent gratitude journal entries (newest first):\n\n${lines}\n\nPlease share a gentle reflection.`,
      });
      return { summary: text };
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI request failed";
      if (message.includes("429"))
        throw new Error("Too many requests right now — please try again in a moment.");
      if (message.includes("402"))
        throw new Error("AI credits are exhausted. Please add credits to continue.");
      throw new Error("Couldn't generate a reflection right now. Please try again.");
    }
  });
