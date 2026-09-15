-- Threaded comments for recaps and tapes on the home page.
-- board = 'recap-comments' or 'tape-comments' to separate the two sections.
-- parent_id = null for top-level comments, references another comment id for replies.

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  board TEXT NOT NULL DEFAULT 'recap-comments',
  parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  author UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_board ON comments(board, created_at DESC);
CREATE INDEX idx_comments_parent ON comments(parent_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read comments"
  ON comments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Signed-in users can post comments"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author);

CREATE POLICY "Authors can delete their own comments"
  ON comments FOR DELETE TO authenticated
  USING (auth.uid() = author);

-- Emoji reactions on comments
CREATE TABLE IF NOT EXISTS comment_reactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comment_id BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (length(emoji) <= 4),
  reactor UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, emoji, reactor)
);

CREATE INDEX idx_comment_reactions_comment ON comment_reactions(comment_id);

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read reactions"
  ON comment_reactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Signed-in users can react"
  ON comment_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reactor);

CREATE POLICY "Users can remove their own reactions"
  ON comment_reactions FOR DELETE TO authenticated
  USING (auth.uid() = reactor);
