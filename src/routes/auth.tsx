import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Mail, ArrowLeft, KeyRound } from "lucide-react";
import { MoodFace } from "@/components/MoodFace";
import { devLogin } from "@/lib/dev-auth.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Grateful" },
      { name: "description", content: "Sign in to your daily gratitude journal with a magic link." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = code.trim();
    if (token.length < 6) return;
    setVerifying(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    if (error) {
      setError(error.message);
      setVerifying(false);
    } else {
      navigate({ to: "/" });
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* soft pastel halos */}
      <div
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full blur-3xl opacity-50"
        style={{ background: "var(--mood-mild)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full blur-3xl opacity-50"
        style={{ background: "var(--mood-good)" }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex items-center gap-1.5">
            {[0, 2, 4].map((l) => (
              <MoodFace key={l} level={l as 0 | 2 | 4} size={34} />
            ))}
          </div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Heart className="h-6 w-6" fill="currentColor" /> Grateful
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A calm, daily space for the things you're grateful for.
          </p>
        </div>

        {status === "sent" ? (
          <div className="rounded-3xl bg-card p-7 text-center shadow-sm">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full" style={{ background: "var(--mood-good-soft)" }}>
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">Check your inbox</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We emailed <span className="font-medium text-foreground">{email}</span>. Tap the magic link, or enter the code below to sign in right here.
            </p>

            <form onSubmit={verifyCode} className="mt-5">
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-center text-2xl font-semibold tracking-[0.4em] outline-none transition-colors focus:border-ring"
              />
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={verifying || code.length < 6}
                className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {verifying ? "Verifying…" : "Sign in with code"}
              </button>
            </form>

            <button
              onClick={() => {
                setStatus("idle");
                setCode("");
                setError(null);
              }}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="rounded-3xl bg-card p-7 shadow-sm">
            <label className="mb-2 block text-sm font-medium" htmlFor="email">
              Your email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-ring"
            />
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send magic link & code"}
            </button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              No password needed — we'll email you a secure link and a one-time code.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
