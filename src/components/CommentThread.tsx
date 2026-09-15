"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

const EMOJIS = ["😂", "🔥", "💀", "🗑️", "👑"];

interface Reaction {
  id: number;
  emoji: string;
  reactor: string;
}

interface Comment {
  id: number;
  body: string;
  parent_id: number | null;
  author: string;
  created_at: string;
  member?: { display_name: string } | null;
  reactions: Reaction[];
  replies: Comment[];
}

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function ReactionBar({ comment, userId, onToggle }: { comment: Comment; userId: string | null; onToggle: (commentId: number, emoji: string) => void }) {
  const grouped = new Map<string, { count: number; mine: boolean }>();
  for (const r of comment.reactions) {
    const existing = grouped.get(r.emoji) ?? { count: 0, mine: false };
    existing.count++;
    if (r.reactor === userId) existing.mine = true;
    grouped.set(r.emoji, existing);
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {[...grouped.entries()].map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggle(comment.id, emoji)}
          className={`rounded-full border px-1.5 py-0.5 text-xs transition-colors ${mine ? "border-gold bg-gold/20 text-gold-bright" : "border-line text-cream-dim hover:border-gold-deep"}`}
        >
          {emoji} {count}
        </button>
      ))}
      <div className="relative group">
        <button type="button" className="rounded-full border border-line px-1.5 py-0.5 text-xs text-cream-dim hover:border-gold-deep">+</button>
        <div className="absolute bottom-full left-0 mb-1 hidden rounded-sm border border-line bg-felt-deep p-1 shadow-lg group-hover:flex gap-1 z-10">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => onToggle(comment.id, e)} className="rounded-sm px-1 py-0.5 text-sm hover:bg-raised">
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SingleComment({
  comment,
  userId,
  onReply,
  onDelete,
  onToggleReaction,
  depth,
}: {
  comment: Comment;
  userId: string | null;
  onReply: (parentId: number) => void;
  onDelete: (id: number) => void;
  onToggleReaction: (commentId: number, emoji: string) => void;
  depth: number;
}) {
  return (
    <div className={depth > 0 ? "ml-6 border-l border-line/40 pl-4" : ""}>
      <div className="py-2">
        <div className="flex items-baseline gap-2">
          <span className="font-head text-sm font-semibold">{comment.member?.display_name ?? "Unknown"}</span>
          <span className="text-xs text-cream-dim">{fmtTime(comment.created_at)}</span>
        </div>
        <p className="mt-0.5 text-sm leading-relaxed">{comment.body}</p>
        <ReactionBar comment={comment} userId={userId} onToggle={onToggleReaction} />
        <div className="mt-1 flex gap-3 text-xs">
          <button type="button" onClick={() => onReply(comment.id)} className="text-cream-dim hover:text-gold">
            reply
          </button>
          {comment.author === userId && (
            <button type="button" onClick={() => onDelete(comment.id)} className="text-cream-dim hover:text-blood">
              delete
            </button>
          )}
        </div>
      </div>
      {comment.replies.map((r) => (
        <SingleComment key={r.id} comment={r} userId={userId} onReply={onReply} onDelete={onDelete} onToggleReaction={onToggleReaction} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function CommentThread({ board }: { board: "recap-comments" | "tape-comments" }) {
  const supabase = getSupabase();
  const user = useUser();
  const userId = user?.id ?? null;

  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase
        .from("comments")
        .select("id, body, parent_id, author, created_at, member:members(display_name)")
        .eq("board", board)
        .order("created_at", { ascending: true }),
      supabase.from("comment_reactions").select("id, comment_id, emoji, reactor"),
    ]).then(([{ data: cData }, { data: rData }]) => {
      const flat = ((cData as unknown as Comment[]) ?? []).map((c) => ({
        ...c,
        reactions: ((rData as unknown as (Reaction & { comment_id: number })[]) ?? []).filter((r) => r.comment_id === c.id),
        replies: [],
      }));
      const map = new Map<number, Comment>();
      for (const c of flat) map.set(c.id, c);
      const roots: Comment[] = [];
      for (const c of flat) {
        if (c.parent_id && map.has(c.parent_id)) {
          map.get(c.parent_id)!.replies.push(c);
        } else {
          roots.push(c);
        }
      }
      setComments(roots);
    });
  }, [supabase, board, version]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !userId || !body.trim()) return;
    setBusy(true);
    await supabase.from("comments").insert({ board, body: body.trim(), author: userId, parent_id: replyTo });
    setBody("");
    setReplyTo(null);
    setBusy(false);
    reload();
  }

  async function remove(id: number) {
    if (!supabase) return;
    await supabase.from("comments").delete().eq("id", id);
    reload();
  }

  async function toggleReaction(commentId: number, emoji: string) {
    if (!supabase || !userId) return;
    const existing = comments
      .flatMap(function flat(c): Comment[] { return [c, ...c.replies.flatMap(flat)]; })
      .find((c) => c.id === commentId)
      ?.reactions.find((r) => r.emoji === emoji && r.reactor === userId);
    if (existing) {
      await supabase.from("comment_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("comment_reactions").insert({ comment_id: commentId, emoji, reactor: userId });
    }
    reload();
  }

  const replyComment = replyTo
    ? comments.flatMap(function flat(c): Comment[] { return [c, ...c.replies.flatMap(flat)]; }).find((c) => c.id === replyTo)
    : null;

  const input = "w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-gold focus:outline-none";

  return (
    <section className="mt-4 space-y-2">
      <p className="kicker">{board === "recap-comments" ? "Recap Discussion" : "Tape Discussion"}</p>

      {comments.length === 0 && <p className="text-sm text-cream-dim">No comments yet. Be the first to talk shit.</p>}
      <div className="divide-y divide-line/30">
        {comments.map((c) => (
          <SingleComment key={c.id} comment={c} userId={userId} onReply={setReplyTo} onDelete={remove} onToggleReaction={toggleReaction} depth={0} />
        ))}
      </div>

      {userId && (
        <form onSubmit={submit} className="flex gap-2 pt-2">
          <div className="flex-1">
            {replyTo && (
              <div className="mb-1 flex items-center gap-2 text-xs text-cream-dim">
                <span>Replying to {replyComment?.member?.display_name ?? "..."}</span>
                <button type="button" onClick={() => setReplyTo(null)} className="text-blood hover:text-blood/80">cancel</button>
              </div>
            )}
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={replyTo ? "Write a reply…" : "Add a comment…"}
              className={input}
              maxLength={2000}
            />
          </div>
          <button disabled={busy || !body.trim()} className="font-head shrink-0 rounded-sm bg-gold px-4 py-2 text-sm font-bold uppercase tracking-widest text-felt-deep disabled:opacity-40">
            Post
          </button>
        </form>
      )}
    </section>
  );
}
