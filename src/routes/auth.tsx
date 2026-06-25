import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Heart, Mail, ArrowLeft, KeyRound } from "lucide-react";
import { MoodFace } from "@/components/MoodFace";
import { devLogin } from "@/lib/dev-auth.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Grateful" },
      { name: "description", content: "Sign in to your daily gratitude journal with a magic link or Google." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Test/admin login bypass
  const runDevLogin = useServerFn(devLogin);
  const [showDev, setShowDev] = useState(false);
  const [devEmail, setDevEmail] = useState("");
  const [devCode, setDevCode] = useState("");
  const [devBusy, setDevBusy] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  async function testLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!devEmail.trim() || !devCode.trim()) return;
    setDevBusy(true);
    setDevError(null);
    try {
      const session = await runDevLogin({
        data: { email: devEmail.trim(), code: devCode.trim() },
      });
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (error) throw error;
      navigate({ to: "/" });
    } catch (err) {
      setDevError(err instanceof Error ? err.message : "Test login failed.");
      setDevBusy(false);
    }
  }


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function signInWithGoogle() {
    setGoogleBusy(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("Could not sign in with Google. Please try again.");
        setGoogleBusy(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch {
      setError("Could not sign in with Google. Please try again.");
      setGoogleBusy(false);
    }
  }

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
          <div className="rounded-2xl bg-card p-7 text-center shadow-sm">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full" style={{ background: "var(--mood-good-soft)" }}>
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">Check your inbox</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We emailed a sign-in link to <span className="font-medium text-foreground">{email}</span>. Tap the link in that email to sign in. It expires shortly and can only be used once.
            </p>

            <button
              onClick={() => {
                setStatus("idle");
                setError(null);
              }}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Use a different email
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-card p-7 shadow-sm">
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={googleBusy}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-input bg-background px-4 py-3 text-base font-semibold transition-colors hover:bg-muted disabled:opacity-60"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              {googleBusy ? "Connecting…" : "Continue with Google"}
            </button>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={sendLink}>
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
                {status === "sending" ? "Sending…" : "Email me a sign-in link"}
              </button>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                No password needed — we'll email you a secure sign-in link.
              </p>
            </form>
          </div>
        )}


        {/* Test / admin login bypass */}
        <div className="mt-6 text-center">
          {showDev ? (
            <form onSubmit={testLogin} className="rounded-2xl border border-dashed border-border bg-card/60 p-5 text-left">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" /> Test login
              </p>
              <input
                type="email"
                autoComplete="off"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder="admin email"
                className="mb-2 w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-ring"
              />
              <input
                type="password"
                autoComplete="off"
                value={devCode}
                onChange={(e) => setDevCode(e.target.value)}
                placeholder="admin code"
                className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-ring"
              />
              {devError && <p className="mt-2 text-sm text-destructive">{devError}</p>}
              <button
                type="submit"
                disabled={devBusy}
                className="mt-3 w-full rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {devBusy ? "Signing in…" : "Enter app"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDev(false);
                  setDevError(null);
                }}
                className="mt-3 block w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowDev(true)}
              className="text-xs font-medium text-muted-foreground/70 hover:text-foreground"
            >
              Test login
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
