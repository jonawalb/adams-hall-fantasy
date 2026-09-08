"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

const QUICK_EMOJIS = ["🔥", "💀", "🤡", "💯", "🤮", "😂", "❤️", "💩", "🧠", "💰", "👀"];

interface Reaction {
  id: number;
  target_type: string;
  target_id: number;
  member_id: string;
  emoji: string;
  reactor?: { display_name: string } | null;
}

interface Comment {
  id: number;
  target_type: string;
  target_id: number;
  parent_id: number | null;
  author: string;
  body: string;
  created_at: string;
  commenter?: { display_name: string } | null;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function firstName(name: string): string {
  return name.split(" ")[0];
}

function CommentItem({
  c,
  myId,
  replies,
  onReply,
  onDelete,
}: {
  c: Comment;
  myId: string | null;
  replies: Comment[];
  onReply: (parentId: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="border-l-2 border-line pl-3">
      <div className="flex items-baseline gap-2">
        <span className="font-head text-xs font-semibold uppercase tracking-wider text-cream">
          {c.commenter?.display_name ?? "???"}
        </span>
        <span className="text-xs text-cream-dim">{timeAgo(c.created_at)}</span>
      </div>
      <p className="mt-0.5 text-sm leading-relaxed">{c.body}</p>
      <div className="mt-1 flex gap-3 text-xs text-cream-dim">
        <button type="button" onClick={() => onReply(c.id)} className="hover:text-gold">Reply</button>
        {c.author === myId && (
          <button type="button" onClick={() => onDelete(c.id)} className="hover:text-blood">Delete</button>
        )}
      </div>
      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((r) => (
            <CommentItem key={r.id} c={r} myId={myId} replies={[]} onReply={onReply} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ThreadProps {
  targetType: string;
  targetId: number;
  ownerId?: string | null;
  ownerTitle?: string;
}

export default function PostThread({ targetType, targetId, ownerId, ownerTitle }: ThreadProps) {
  const supabase = getSupabase();
  const user = useUser();
  const myId = supabase ? user?.id ?? null : null;

  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("reactions")
      .select("id, target_type, target_id, member_id, emoji, reactor:members(display_name)")
      .eq("target_type", targetType).eq("target_id", targetId)
      .then(({ data }) => setReactions((data as unknown as Reaction[]) ?? []));
    supabase.from("comments")
      .select("id, target_type, target_id, parent_id, author, body, created_at, commenter:members(display_name)")
      .eq("target_type", targetType).eq("target_id", targetId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setComments((data as unknown as Comment[]) ?? []));
  }, [supabase, targetType, targetId]);

  async function toggleReaction(emoji: string) {
    if (!supabase || !myId) return;
    const existing = reactions.find((r) => r.member_id === myId && r.emoji === emoji);
    if (existing) {
      setReactions((rs) => rs.filter((r) => r.id !== existing.id));
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      const { data, error } = await supabase.from("reactions")
        .insert({ target_type: targetType, target_id: targetId, member_id: myId, emoji })
        .select("id, target_type, target_id, member_id, emoji, reactor:members(display_name)")
        .single();
      if (data && !error) setReactions((rs) => [...rs, data as unknown as Reaction]);
    }
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !myId || !commentText.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.from("comments")
      .insert({ target_type: targetType, target_id: targetId, parent_id: replyTo, author: myId, body: commentText.trim() })
      .select("id, target_type, target_id, parent_id, author, body, created_at, commenter:members(display_name)")
      .single();
    if (data && !error) {
      setComments((cs) => [...cs, data as unknown as Comment]);
      if (ownerId && ownerId !== myId) {
        await supabase.from("notifications").insert({
          recipient: ownerId,
          actor: myId,
          kind: replyTo ? "reply" : "comment",
          target_type: targetType,
          target_id: targetId,
          target_title: ownerTitle ?? null,
          body: commentText.trim().slice(0, 200),
        });
      }
      if (replyTo) {
        const parent = comments.find((c) => c.id === replyTo);
        if (parent && parent.author !== myId && parent.author !== ownerId) {
          await supabase.from("notifications").insert({
            recipient: parent.author,
            actor: myId,
            kind: "reply",
            target_type: targetType,
            target_id: targetId,
            target_title: ownerTitle ?? null,
            body: commentText.trim().slice(0, 200),
          });
        }
      }
    }
    setCommentText("");
    setReplyTo(null);
    setBusy(false);
  }

  async function deleteComment(id: number) {
    if (!supabase) return;
    setComments((cs) => cs.filter((c) => c.id !== id && c.parent_id !== id));
    await supabase.from("comments").delete().eq("id", id);
  }

  const grouped: Record<string, { count: number; mine: boolean; names: string[] }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false, names: [] };
    grouped[r.emoji].count++;
    if (r.member_id === myId) grouped[r.emoji].mine = true;
    if (r.reactor?.display_name) grouped[r.emoji].names.push(firstName(r.reactor.display_name));
  }

  const activeEmojis = Object.keys(grouped).filter((e) => grouped[e].count > 0);
  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesFor = (parentId: number) => comments.filter((c) => c.parent_id === parentId);
  const replyingTo = replyTo ? comments.find((c) => c.id === replyTo) : null;
  const hasActivity = activeEmojis.length > 0 || comments.length > 0;

  return (
    <div className="mt-3 space-y-3 border-t border-line pt-3">
      {/* Active reactions with names */}
      {activeEmojis.length > 0 && (
        <div className="space-y-1">
          {activeEmojis.map((emoji) => {
            const g = grouped[emoji];
            return (
              <div key={emoji} className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggleReaction(emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-colors ${
                    g.mine
                      ? "border-gold bg-gold/15 text-cream"
                      : "border-line text-cream-dim hover:border-gold-deep hover:text-cream"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-xs font-semibold">{g.count}</span>
                </button>
                <span className="text-cream-dim">{g.names.join(", ")}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Emoji picker */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowPicker((s) => !s)}
          className="rounded-full border border-dashed border-line px-2 py-0.5 text-xs text-cream-dim hover:border-gold-deep hover:text-cream"
        >
          {showPicker ? "−" : "+"}  React
        </button>
        {showPicker && QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => { toggleReaction(emoji); setShowPicker(false); }}
            className={`rounded-full border px-1.5 py-0.5 text-sm transition-colors ${
              grouped[emoji]?.mine
                ? "border-gold bg-gold/15"
                : "border-line hover:border-gold-deep hover:bg-gold/10"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Comments — always visible */}
      <div className="space-y-3">
        {topLevel.length > 0 && (
          <p className="font-head text-xs uppercase tracking-wider text-cream-dim">
            {comments.length} comment{comments.length === 1 ? "" : "s"}
          </p>
        )}

        {topLevel.map((c) => (
          <CommentItem
            key={c.id}
            c={c}
            myId={myId}
            replies={repliesFor(c.id)}
            onReply={(id) => setReplyTo(id)}
            onDelete={deleteComment}
          />
        ))}

        {myId && (
          <form onSubmit={submitComment} className="flex gap-2">
            <div className="min-w-0 flex-1">
              {replyingTo && (
                <div className="mb-1 flex items-center gap-2 text-xs text-cream-dim">
                  <span>Replying to {replyingTo.commenter?.display_name ?? "???"}</span>
                  <button type="button" onClick={() => setReplyTo(null)} className="text-cream-dim hover:text-blood">&times;</button>
                </div>
              )}
              <input
                placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full rounded-sm border border-line bg-felt-deep/60 px-3 py-1.5 text-sm text-cream placeholder:text-cream-dim/60 focus:border-gold focus:outline-none"
              />
            </div>
            <button
              disabled={busy || !commentText.trim()}
              className="font-head shrink-0 rounded-sm bg-gold px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-felt-deep disabled:opacity-40"
            >
              Post
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
