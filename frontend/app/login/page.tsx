"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "loading" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setState("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setState("error");
    } else {
      setState("sent");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      {/* Glow */}
      <div className="pointer-events-none fixed inset-0 flex items-start justify-center">
        <div className="h-[40rem] w-[40rem] rounded-full bg-emerald-600/10 blur-3xl" />
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
          {state === "sent" ? (
            <SentState email={email} onReset={() => { setState("idle"); setEmail(""); }} />
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
              <p className="text-slate-400 text-sm mb-6">
                Enter your email — we&apos;ll send a magic link. No password needed.
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

                {state === "error" && (
                  <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-2.5">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={state === "loading" || !email}
                  className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 font-semibold text-slate-950 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {state === "loading" ? (
                    <>
                      <SpinnerIcon />
                      Sending link…
                    </>
                  ) : (
                    "Send magic link"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-500">
                By continuing you agree to our{" "}
                <span className="underline underline-offset-2 cursor-pointer hover:text-slate-300 transition-colors">
                  Terms of Service
                </span>
              </p>
            </>
          )}
        </div>

        {/* Sport pills */}
        <div className="flex flex-wrap justify-center gap-2 opacity-30 select-none">
          {["🎾 Tennis", "🏀 Basketball", "⚽ Football", "🚴 Cycling", "🧗 Climbing"].map(
            (s) => (
              <span
                key={s}
                className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700"
              >
                {s}
              </span>
            )
          )}
        </div>
      </div>
    </main>
  );
}

function SentState({ email, onReset }: { email: string; onReset: () => void }) {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <span className="text-2xl">📬</span>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">Check your inbox</h2>
        <p className="text-slate-400 text-sm mt-1">
          We sent a magic link to{" "}
          <span className="text-emerald-400 font-medium">{email}</span>
        </p>
      </div>
      <p className="text-xs text-slate-500">
        Click the link in the email to sign in. It expires in 60 minutes.
      </p>
      <button
        onClick={onReset}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2.5 text-sm font-medium transition-colors"
      >
        Use a different email
      </button>
    </div>
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
