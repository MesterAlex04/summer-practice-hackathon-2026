"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "loading" | "error";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [state, setState]       = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !password) return;

    setState("loading");
    setErrorMsg("");

    const supabase = createClient();

    // Try sign-in first; if user doesn't exist, sign them up automatically
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (!signInError) {
      window.location.href = "/";
      return;
    }

    // "Invalid login credentials" can mean wrong password OR user doesn't exist yet
    if (
      signInError.message.includes("Invalid login credentials") ||
      signInError.message.includes("invalid_credentials")
    ) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });

      if (!signUpError) {
        // signUp logs the user in automatically when email confirmation is disabled
        window.location.href = "/";
        return;
      }

      setErrorMsg(signUpError.message);
    } else {
      setErrorMsg(signInError.message);
    }

    setState("error");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0 flex items-start justify-center">
        <div className="h-160 w-160 rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 shadow-lg mb-2">
            <span className="text-3xl">🏃</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            ShowUp<span className="text-emerald-400">2</span>Move
          </h1>
          <p className="text-slate-400 text-sm">Find your crew. Show up. Play.</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
          <p className="text-slate-400 text-sm mb-6">
            New here? Just enter any email and pick a password — we&apos;ll create your account instantly.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={state === "loading"}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="6+ characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={state === "loading"}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 transition"
              />
            </div>

            {state === "error" && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-2.5">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={state === "loading" || !email || !password}
              className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 font-semibold text-slate-950 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {state === "loading" ? (
                <>
                  <SpinnerIcon />
                  Signing in…
                </>
              ) : (
                "Sign in / Sign up"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            No email verification needed — just enter your credentials.
          </p>
        </div>

        {/* Sport pills */}
        <div className="flex flex-wrap justify-center gap-2 opacity-30 select-none">
          {["🎾 Tennis", "🏀 Basketball", "⚽ Football", "🚴 Cycling", "🧗 Climbing"].map((s) => (
            <span
              key={s}
              className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
