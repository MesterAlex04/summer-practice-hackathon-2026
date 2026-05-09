"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveProfile, type ProfileActionState } from "@/app/profile/actions";
import type { ExtractedSport } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SPORT_EMOJI, type Sport } from "@/lib/sports";

const SKILL_BADGE: Record<string, string> = {
  beginner: "bg-slate-700 text-slate-300",
  intermediate: "bg-blue-900/60 text-blue-300",
  advanced: "bg-emerald-900/60 text-emerald-300",
  professional: "bg-amber-900/60 text-amber-300",
};

const initialState: ProfileActionState = { status: "idle" };

type Props = {
  defaultDisplayName: string;
  defaultBio: string;
  savedSports: ExtractedSport[];
};

export function ProfileForm({ defaultDisplayName, defaultBio, savedSports }: Props) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);

  const displaySports = state.status === "success"
    ? (state.extractedSports ?? [])
    : savedSports;

  return (
    <Card className="w-full max-w-lg border-slate-800 bg-slate-900/80 backdrop-blur-sm text-white">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-lg font-semibold text-white">Your Profile</CardTitle>
        <CardDescription className="text-slate-400">
          Write a short bio — our AI will automatically detect your sports and skill levels.
        </CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-5 pt-5">

          {/* Display name */}
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-slate-300 text-sm font-medium">
              Display name
            </Label>
            <Input
              id="displayName"
              name="displayName"
              placeholder="e.g. Alex M."
              defaultValue={defaultDisplayName}
              required
              disabled={pending}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-slate-300 text-sm font-medium">
              Bio
              <span className="ml-1.5 font-normal text-slate-500">(tell us about your sports)</span>
            </Label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              placeholder={`e.g. "I play tennis twice a week at an intermediate level and enjoy casual 5-aside football on weekends. Also getting into cycling."`}
              defaultValue={defaultBio}
              disabled={pending}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 transition resize-none"
            />
          </div>

          {/* Extracted sports preview */}
          {displaySports.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {state.status === "success" ? "AI detected" : "Your sports"}
              </p>
              <div className="flex flex-wrap gap-2">
                {displaySports.map(({ sport, skill_level }) => (
                  <span
                    key={sport}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${SKILL_BADGE[skill_level] ?? SKILL_BADGE.beginner}`}
                  >
                    <span>{SPORT_EMOJI[sport as Sport] ?? "🏅"}</span>
                    <span className="capitalize">{sport.replace("_", " ")}</span>
                    <span className="opacity-60">· {skill_level}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {state.status === "error" && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-2.5">
              {state.message}
            </p>
          )}

          {/* AI warning (key missing, API error, etc.) */}
          {state.status === "success" && state.aiWarning && (
            <p className="text-sm text-amber-400 bg-amber-950/40 border border-amber-900/60 rounded-lg px-4 py-2.5">
              ⚠️ {state.aiWarning}
            </p>
          )}

          {/* Success hint — only shown when AI ran fine but found nothing */}
          {state.status === "success" && !state.aiWarning && displaySports.length === 0 && (
            <p className="text-sm text-slate-400">
              Profile saved! No sports were detected in your bio — add more detail to let the AI identify your interests.
            </p>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-3 bg-slate-800/50">
          <Button
            type="submit"
            disabled={pending}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {pending ? (
              <>
                <SpinnerIcon />
                Analysing bio…
              </>
            ) : state.status === "success" ? (
              "Save again"
            ) : (
              "Save & detect sports"
            )}
          </Button>

          {state.status === "success" && (
            <Link
              href="/today"
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
            >
              Continue → ShowUpToday
            </Link>
          )}
        </CardFooter>
      </form>
    </Card>
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
