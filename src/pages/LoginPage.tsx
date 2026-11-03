import { getSettings, login, oauthLogin, signup } from "@netlify/identity";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router";
import Logo from "../components/Logo";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);

  // Only show the Google button if it's turned on in the Netlify dashboard.
  useEffect(() => {
    getSettings()
      .then((settings) => setGoogleEnabled(settings.providers.google))
      .catch(() => setGoogleEnabled(false));
  }, []);

  if (loading) return null;
  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? "/"} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") await signup(email, password);
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="rise w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo size={48} />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
            {mode === "login" ? "Welcome back" : "Join Flipcast"}
          </h1>
          <p className="mt-2 text-stone-600">AI insights for your Depop shop.</p>
        </div>

        <div className="card mt-8 p-6">
          {googleEnabled && (
            <>
              <button
                type="button"
                onClick={() => oauthLogin("google")}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-stone-50"
              >
                <GoogleIcon /> Continue with Google
              </button>
              <div className="my-5 flex items-center gap-3 text-xs text-stone-400">
                <span className="h-px flex-1 bg-stone-200" /> or <span className="h-px flex-1 bg-stone-200" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full justify-center disabled:opacity-70">
              {busy && <LoaderCircle size={16} className="animate-spin" />}
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-stone-600">
          {mode === "login" ? "New to Flipcast?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="font-semibold text-rose-600 hover:underline"
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
