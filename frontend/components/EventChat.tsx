"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = { display_name: string; photo_url: string | null };

type Message = {
  id: string;
  sender_id: string | null;
  content: string;
  message_type: "user" | "system" | "ai";
  created_at: string;
  sender: Profile | null;
};

type Participant = {
  user_id: string;
  profiles: Profile | null;
};

type Props = {
  eventId: string;
  currentUserId: string;
  participants: Participant[];
};

export default function EventChat({ eventId, currentUserId, participants }: Props) {
  const [chatId, setChatId]     = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Build userId → profile lookup from the participants we already have
  const profileMap = new Map<string, Profile>(
    participants
      .filter((p) => p.profiles !== null)
      .map((p) => [p.user_id, p.profiles!])
  );

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function init() {
      const { data: chat } = await supabase
        .from("chats")
        .select("id")
        .eq("event_id", eventId)
        .single();

      // Effect was already cleaned up while we were awaiting — bail out.
      if (cancelled) return;

      if (!chat) {
        setLoading(false);
        return;
      }

      setChatId(chat.id);

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, content, message_type, created_at")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      setMessages(
        (msgs ?? []).map((m) => ({
          ...m,
          message_type: m.message_type as Message["message_type"],
          sender: m.sender_id ? (profileMap.get(m.sender_id) ?? null) : null,
        }))
      );
      setLoading(false);

      // Unique suffix prevents name collision when Strict Mode double-fires.
      channel = supabase
        .channel(`chat:${chat.id}:${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `chat_id=eq.${chat.id}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              sender_id: string | null;
              content: string;
              message_type: string;
              created_at: string;
            };
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              // Replace any matching optimistic placeholder for this message
              const filtered = prev.filter(
                (m) =>
                  !(
                    m.id.startsWith("opt-") &&
                    m.sender_id === row.sender_id &&
                    m.content === row.content
                  )
              );
              return [
                ...filtered,
                {
                  ...row,
                  message_type: row.message_type as Message["message_type"],
                  sender: row.sender_id ? (profileMap.get(row.sender_id) ?? null) : null,
                },
              ];
            });
          }
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const content = text.trim();
    if (!content || !chatId || sending) return;

    setSendError(null);
    setSending(true);
    setText("");
    resetTextareaHeight();

    // Optimistic update so the message appears immediately
    const optimisticId = `opt-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id:           optimisticId,
        sender_id:    currentUserId,
        content,
        message_type: "user",
        created_at:   new Date().toISOString(),
        sender:       profileMap.get(currentUserId) ?? null,
      },
    ]);

    const supabase = createClient();
    const { error } = await supabase.from("messages").insert({
      chat_id:      chatId,
      sender_id:    currentUserId,
      content,
      message_type: "user",
    });

    if (error) {
      // Revert the optimistic message and surface the error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setSendError(error.message);
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  function resetTextareaHeight() {
    const el = textareaRef.current;
    if (el) el.style.height = "auto";
  }

  if (loading) {
    return (
      <div className="h-24 flex items-center justify-center">
        <span className="text-slate-500 text-sm">Loading chat…</span>
      </div>
    );
  }

  if (!chatId) {
    return (
      <div className="h-16 flex items-center justify-center">
        <span className="text-slate-500 text-sm">No chat available for this event yet.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
      {/* Message list */}
      <div className="overflow-y-auto px-4 py-4 space-y-3 min-h-40 max-h-80">
        {messages.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-6">
            No messages yet — say hi! 👋
          </p>
        ) : (
          messages.map((msg) => {
            if (msg.message_type !== "user") {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-xs text-slate-500 italic bg-slate-800/60 px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const isMe     = msg.sender_id === currentUserId;
            const name     = msg.sender?.display_name ?? "Unknown";
            const initials = name.slice(0, 2).toUpperCase();
            const time     = new Date(msg.created_at).toLocaleTimeString("en-US", {
              hour:   "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <span className="text-emerald-300 text-[10px] font-bold">{initials}</span>
                  </div>
                )}

                <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && (
                    <span className="text-xs text-slate-500 px-1">{name}</span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-snug break-words ${
                      isMe
                        ? "bg-emerald-500 text-slate-950 rounded-br-md"
                        : "bg-slate-700/80 text-slate-100 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-slate-600 px-1">{time}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send error */}
      {sendError && (
        <div className="px-4 py-2 bg-red-950/50 border-t border-red-900/40 text-red-300 text-xs">
          ⚠️ {sendError}
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-slate-700/60 px-4 py-3 flex items-end gap-3 bg-slate-900/60">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Message the crew…"
          rows={1}
          disabled={sending}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none disabled:opacity-50 transition leading-snug"
          style={{ minHeight: "42px" }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg className="w-4 h-4 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}
