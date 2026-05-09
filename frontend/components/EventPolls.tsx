"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { castVote, closePoll, createPoll } from "@/app/events/[id]/polls-actions";

export type PollOption = {
  id: string;
  label: string;
  position: number;
  votes: number;
};

export type Poll = {
  id: string;
  question: string;
  created_by: string;
  closed: boolean;
  created_at: string;
  options: PollOption[];
  myVoteOptionId: string | null;
  totalVotes: number;
};

type Props = {
  eventId: string;
  currentUserId: string;
  isCaptain: boolean;
  polls: Poll[];
};

export default function EventPolls({ eventId, currentUserId, isCaptain, polls }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold">Polls</h2>
        {isCaptain && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-full border bg-slate-800/70 text-slate-200 border-slate-700/60 hover:border-emerald-400/60 hover:text-emerald-300 transition-all"
          >
            + New poll
          </button>
        )}
      </div>

      {showForm && (
        <NewPollForm
          eventId={eventId}
          onCancel={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {polls.length === 0 && !showForm && (
        <p className="text-slate-500 text-sm text-center py-4 rounded-xl bg-slate-800/40 border border-slate-700/40 border-dashed">
          {isCaptain
            ? "No polls yet — start one to vote on a venue or time."
            : "No polls yet — your captain can start one."}
        </p>
      )}

      <div className="space-y-3">
        {polls.map((poll) => (
          <PollCard
            key={poll.id}
            poll={poll}
            eventId={eventId}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

function NewPollForm({
  eventId,
  onCancel,
  onSuccess,
}: {
  eventId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function addOption() {
    if (options.length < 8) setOptions([...options, ""]);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createPoll(eventId, question, options);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      onSuccess();
    });
  }

  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-4 space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Question
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What time should we meet?"
          className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/60 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Options
        </label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/60 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-slate-500 hover:text-red-400 text-lg leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition"
                  aria-label="Remove option"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 8 && (
          <button
            type="button"
            onClick={addOption}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition"
          >
            + Add option
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-300 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2">
          ⚠️ {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="flex-1 text-sm font-bold py-2.5 rounded-xl bg-linear-to-r from-emerald-500 to-cyan-500 text-slate-950 border border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-60 transition-all"
        >
          {pending ? "Creating…" : "Create poll"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="text-sm font-medium px-4 py-2.5 rounded-xl border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function PollCard({
  poll,
  eventId,
  currentUserId,
}: {
  poll: Poll;
  eventId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isCreator = poll.created_by === currentUserId;
  const hasVoted = poll.myVoteOptionId !== null;
  const total = poll.totalVotes || 0;

  function vote(optionId: string) {
    if (poll.closed) return;
    setError(null);
    startTransition(async () => {
      const res = await castVote(poll.id, optionId, eventId);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function close() {
    setError(null);
    startTransition(async () => {
      const res = await closePoll(poll.id, eventId);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold leading-snug">{poll.question}</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {total} {total === 1 ? "vote" : "votes"}
            {poll.closed && <span className="ml-2 text-amber-400">· closed</span>}
          </p>
        </div>
        {isCreator && !poll.closed && (
          <button
            onClick={close}
            disabled={pending}
            className="text-[10px] font-medium px-2 py-1 rounded-full border border-slate-700/60 text-slate-400 hover:text-amber-300 hover:border-amber-500/40 transition shrink-0 disabled:opacity-60"
          >
            Close
          </button>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((opt) => {
          const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
          const isMine = poll.myVoteOptionId === opt.id;
          const showResults = hasVoted || poll.closed;

          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={pending || poll.closed}
              className={`w-full text-left rounded-xl border transition-all relative overflow-hidden ${
                poll.closed
                  ? "border-slate-700/60 cursor-default"
                  : isMine
                  ? "border-emerald-500/60 bg-emerald-500/5"
                  : "border-slate-700/60 hover:border-emerald-500/40 hover:bg-slate-700/30"
              } disabled:cursor-not-allowed`}
            >
              {showResults && (
                <div
                  className={`absolute inset-y-0 left-0 ${
                    isMine ? "bg-emerald-500/20" : "bg-slate-700/40"
                  } transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-white text-sm font-medium flex items-center gap-2">
                  {isMine && <span className="text-emerald-400">✓</span>}
                  {opt.label}
                </span>
                {showResults && (
                  <span className="text-slate-300 text-xs font-bold tabular-nums shrink-0">
                    {pct}% · {opt.votes}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-300 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
